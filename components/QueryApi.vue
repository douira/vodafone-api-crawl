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
import PromisePool from "es6-promise-pool"
import { getAddressStatus } from "~/util/serviceApi"

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

      //how many requests will be sent out concurrently
      concurrency: 6,

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
    totalNonOpenFraction() {
      return 1 - this.progress.open / this.progress.total
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
  },
  beforeDestroy() {
    //get rid of the timer again
    clearInterval(this.intervalToken)
  },
  methods: {
    //get
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
        open: total,
        pending: 0,
        completed: 0,
        errored: 0
      }
    },

    //processes one address with the service api
    async processAddress(address) {
      //count as pending
      this.progress.open--
      this.progress.pending++

      //mark address as pending
      address.queryState = "pending"

      //catch query errors
      try {
        //do the query and attach the result to the address it belongs to
        address.queryResult = await getAddressStatus(address)

        //mark address as completed
        address.queryState = "completed"
        console.log(address.queryResult)
        //and count as completed
        this.progress.completed++
      } catch (error) {
        //log error and count as errored
        console.log("service query error", error, address)
        this.progress.errored++

        //set error state
        address.queryState = "errored"
      } finally {
        //count as not pending
        this.progress.pending--
      }
    },

    //starts querying all the addresses
    async startQuery() {
      //start loading indicator
      this.loading = true

      //save the start timer of measuring elapsed time
      this.startTime = this.time

      //slice the addresses to save the state in case in changes in the mean time
      const workingAddresses = this.addresses.slice()

      //reset the progress
      this.resetProgress(workingAddresses.length)

      //mark all addresses as open
      workingAddresses.forEach(address => (address.queryState = "open"))

      //the next address index to process
      let nextIndex = 0

      //catch any errors that occur
      try {
        /*make a promise pool with a promise generator,
        the generator can't be a async function as it never returns null
        but a promise that resolves with the value null*/
        const pool = new PromisePool(() => {
          //get the next address to process
          const address = workingAddresses[nextIndex++]

          //if there is no address, we're finished
          if (!address) {
            //return null to signal being finished
            return null
          }

          //return the promise generated by the address processor
          return this.processAddress(address)
        }, this.concurrency)

        //wait for the pool to complete processing
        await pool.start()

        //reset error if not thrown
        this.error = null
      } catch (error) {
        //set error state with message
        this.error = error
        console.error(error)
      } finally {
        //finished loading one way or another
        this.loading = false

        //save the stop time
        this.stopTime = this.time
      }
    }
  }
}
</script>
