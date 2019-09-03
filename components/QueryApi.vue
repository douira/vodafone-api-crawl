<template>
  <div>
    <h4 class="title my-3">Check the service availability</h4>
    <v-alert v-if="error" type="error" border="left">
      An error occurred while querying the service availability API:
      {{ error.message }}
    </v-alert>
    <v-btn
      color="success"
      :disabled="!addresses || loading"
      @click="startQuery"
    >
      <v-icon left>mdi-check-network</v-icon>
      Start Requests
    </v-btn>
    <v-progress-circular
      v-show="loading"
      indeterminate
      class="ml-4"
      color="primary"
      :size="30"
    />
    <v-card class="pa-2 mt-3">
      <v-container>
        <template v-if="progress">
          <span class="title">Processing Status</span>
          <v-progress-linear
            :value="finishedFraction * 100"
            :buffer-value="
              displayProgressPending ? totalNonOpenFraction * 100 : 0
            "
            rounded
            striped
            height="20"
            class="my-2"
          >
            {{ progress.completed + progress.errored }}/{{ progress.total }}
          </v-progress-linear>
          <v-row>
            <v-col>
              <v-row v-for="(amount, name) in progress" :key="name" dense>
                <v-col md="5">
                  <v-icon :color="progressStyling[name].color" class="mr-1">
                    {{ progressStyling[name].icon }}
                  </v-icon>
                  <span
                    :class="{
                      'font-weight-bold': progressStyling[name].bold
                    }"
                    >{{ name }}:</span
                  >
                  <v-divider
                    v-if="progressStyling[name].divider"
                    class="mt-2"
                  />
                </v-col>
                <v-col cols="auto" class="text-right">{{
                  progress[name]
                }}</v-col>
              </v-row>
            </v-col>
            <v-col cols="auto"><v-divider vertical/></v-col>
            <v-col>
              <template v-if="loading || timeRemaining !== null">
                Estimated time remaining:
                {{
                  timeRemaining === null
                    ? "calculating..."
                    : formatDuration(timeRemaining)
                }}
                <br />
              </template>

              Elapsed time: {{ formatDuration(timeElapsed) }}
            </v-col>
          </v-row>
        </template>
        <template v-else>
          There {{ addresses && addresses.length === 1 ? "is" : "are" }}
          {{ addresses ? addresses.length : "no" }} address{{
            addresses && addresses.length === 1 ? "" : "es"
          }}
          to process.
        </template>
      </v-container>
    </v-card>
  </div>
</template>

<script>
import humanizeDuration from "humanize-duration"
import io from "socket.io-client"
import { makeAddressCacheKey, getCache, setCache } from "~/util/util"

export default {
  props: {
    //the address data
    addresses: { type: Array, default: null }
  },
  data() {
    return {
      //if there was an error, display it
      error: null,

      //if we are currently still loading from the address api
      loading: false,

      //the current progress status contains information about the progress of the queries
      progress: null,

      //styling of the progess display
      progressStyling: {
        total: {
          color: "blue",
          icon: "mdi-sigma",
          bold: true,
          divider: true
        },
        open: {
          color: "blue",
          icon: "mdi-progress-clock"
        },
        pending: {
          color: "amber",
          icon: "mdi-settings"
        },
        completed: {
          color: "success",
          icon: "mdi-check-circle-outline",
          divider: true
        },
        errored: {
          color: "error",
          icon: "mdi-alert-circle-outline"
        }
      },

      //when the processing started and stopped
      startTime: null,
      stopTime: null,

      //the current internal time and the token for removing the internval
      time: Date.now(),
      intervalToken: null
    }
  },
  computed: {
    //calculate the progress percentage of completed or errored addresses
    finishedFraction() {
      return (
        (this.progress.errored + this.progress.completed) / this.progress.total
      )
    },

    //calculate the progress percentage of all non open addresses
    unfinishedFraction() {
      return 1 - this.finishedFraction
    },

    //the elapsed time
    timeElapsed() {
      return (this.loading ? this.time : this.stopTime) - this.startTime
    },

    //the estimated time remaining
    timeRemaining() {
      //calculate time from progress and elapsed time
      //return null if not enough time passed to properly calculate
      return this.timeElapsed < 15000
        ? null
        : //calculate the speed and then divide the remaining work by the speed
          (1 - this.finishedFraction) /
            (this.finishedFraction / this.timeElapsed)
    },

    //if the buffer part of the linear progress should be displayed
    displayProgressPending() {
      //don't display if the pending is too small compared to the rest
      return this.concurrency / this.progress.total > 0.005
    }
  },
  created() {
    //start an interval that changes the internal timer
    this.intervalToken = setInterval(() => (this.time = Date.now()), 1000)

    //connect to the server
    this.socket = io("http://localhost:3001")

    //register handlers for data coming back
    this.socket.on("response", response => {
      //get the address with the index from the response
      const address = this.addresses[response.index]

      //count as not pending
      this.progress.pending--

      //if response is an error
      if (response.error) {
        //log error and count as errored
        console.log("service query error", response.error, address)
        this.progress.errored++

        //set error state
        address.queryState = "errored"
      } else {
        //do the query and attach the result to the address it belongs to
        address.queryResult = response.data

        //set the data in the cache
        setCache(`q_${makeAddressCacheKey(address)}`, address.queryResult)

        //mark address as completed
        address.queryState = "completed"
        console.log(address)

        //and count as completed
        this.progress.completed++
      }

      //stop loading if done
      this.checkFinishLoading()
    })
  },
  beforeDestroy() {
    //get rid of the timer again
    clearInterval(this.intervalToken)
  },
  methods: {
    //finishes the loading
    checkFinishLoading() {
      //if nothing left to do
      if (!this.progress.pending) {
        //disable loading display
        this.loading = false

        //record end time
        this.stopTime = this.time
      }
    },

    //formats a duration with a default format
    formatDuration(duration, options = {}) {
      //use humanize duration to format the time and extend default options
      return humanizeDuration(duration, {
        round: true,
        serialComma: false,
        largest: 2,
        ...options
      })
    },

    //on updating the addresses
    addressesUpdated() {
      //if not currently loading
      if (!this.loading) {
        //reset the progress to display the start message
        this.progress = null
      }
    },

    //resets the progress with a given total
    resetProgress(total) {
      this.progress = {
        total: total,
        pending: total,
        completed: 0,
        errored: 0
      }
    },

    //starts querying all the addresses
    async startQuery() {
      //start loading indicator
      this.loading = true

      //save the start timer of measuring elapsed time
      this.startTime = this.time

      //reset the progress
      this.resetProgress(this.addresses.length)

      //check if we have cached data for some addresses
      this.addresses.forEach(address => {
        //make a cache key for this address
        const cacheKey = `q_${makeAddressCacheKey(address)}`

        //get a cache result
        const cacheResult = getCache(cacheKey)

        //if available, use cache result as query result
        if (cacheResult) {
          address.queryState = "completed"
          address.queryResult = cacheResult
          this.progress.pending--
          this.progress.completed++
        } else {
          //address still needs to be processed
          address.queryState = "open"
        }
      })

      //stop loading if done
      this.checkFinishLoading()

      //stop if nothing left to do
      if (!this.loading) {
        return
      }

      //send the addresses to the server for processing,
      //fill the completed addresses with placeholdres
      this.socket.emit(
        "addresses",
        this.addresses.map(address =>
          address.queryState === "completed" ? 0 : address
        )
      )
    }
  }
}
</script>
