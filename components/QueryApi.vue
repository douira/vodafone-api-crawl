<template>
  <div>
    <h4 class="title my-3">Check the service availability</h4>
    <v-alert v-if="error" type="error" border="left">
      An error occurred while querying the service availability API:
      {{ error.message }}
    </v-alert>
    <v-btn color="green" :disabled="!addresses" @click="startQuery">
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
            :value="finishedPercentage"
            :buffer-value="totalNonOpenPercentage"
            rounded
            striped
            height="20"
            class="my-2"
          >
            {{ progress.completed + progress.errored }}/{{ progress.total }}
          </v-progress-linear>
          <v-row v-for="(amount, name) in progress" :key="name" dense>
            <v-col cols="2">
              <v-icon :color="progressStyling[name].color" class="mr-1">
                {{ progressStyling[name].icon }}
              </v-icon>
              {{ name }}:
            </v-col>
            <v-col cols="auto" class="text-right">{{ progress[name] }}</v-col>
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
          icon: "mdi-sigma"
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
          icon: "mdi-check-circle-outline"
        },
        errored: {
          color: "error",
          icon: "mdi-alert-circle-outline"
        }
      },

      //how many requests will be sent out concurrently
      concurrency: 3
    }
  },
  computed: {
    //calculate the progress percentage of completed or errored addresses
    finishedPercentage() {
      return (
        (100 * (this.progress.errored + this.progress.completed)) /
        this.progress.total
      )
    },
    //calculate the progress percentage of all non open addresses
    totalNonOpenPercentage() {
      return 100 * (1 - this.progress.open / this.progress.total)
    }
  },
  methods: {
    //processes one address with the service api
    async processAddress(address) {
      //catch query errors
      try {
        //do the query and attach the result to the address it belongs to
        address.queryResult = await getAddressStatus(address)

        //mark address as completed
        address.queryState = "completed"

        //and count as completed
        this.progress.completed++
      } catch (error) {
        //log error and count as errored
        console.log("service query error", error, address)
        this.progress.errored++

        //also attach error to address for reference
        address.queryState = "errored"
        address.error = error
      } finally {
        //count as not pending
        this.progress.pending--
      }
    },
    //starts querying all the addresses
    async startQuery() {
      //start loading indicator
      this.loading = true

      //slice the addresses to save the state in case in changes in the mean time
      const workingAddresses = this.addresses.slice()

      //reset the progress
      this.progress = {
        total: workingAddresses.length,
        open: workingAddresses.length,
        pending: 0,
        completed: 0,
        errored: 0
      }

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
            console.log("stop", nextIndex)
            //return null to signal being finished
            return null
          }

          //count as pending
          this.progress.open--
          this.progress.pending++

          //mark address as pending
          address.queryState = "pending"
          console.log("start", address, nextIndex)
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
      }
    }
  }
}
</script>
