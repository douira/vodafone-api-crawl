<template>
  <v-form ref="form" v-model="formValid" @submit.prevent>
    <h4 class="title">Select an address as the starting point</h4>
    <div class="my-3">
      <v-alert v-if="error" type="error">
        An error occurred while fetching your current address:
        {{ error.message }}
      </v-alert>
      <div v-if="geolocationSupported">
        <v-btn color="primary" @click="fetchAddress">
          <v-icon left>mdi-crosshairs-gps</v-icon>
          Use location
        </v-btn>
        <v-progress-circular
          v-show="loading"
          indeterminate
          class="ml-4"
          color="primary"
          :size="30"
        />
      </div>

      <p v-else class="text--secondary">Geolocation is not supported.</p>
    </div>
    <v-text-field
      v-model="address.zipcode"
      required
      label="Zipcode"
      @input="onAddressChange"
    />
    <v-text-field
      v-model="address.street"
      required
      label="Street"
      @input="onAddressChange"
    />
    <v-text-field
      v-model="address.housenumber"
      required
      label="Housenumber"
      @input="onAddressChange"
    />
    <p>OSM ID: {{ address.osmId }}</p>
  </v-form>
</template>

<script>
import { getAddress, updateOSMId } from "~/util/geo"
import debounce from "debounce-promise"

export default {
  data() {
    return {
      //if the input form is displayed as valid
      formValid: true,

      //the address result as received from the api
      address: {
        zipcode: "",
        street: "",
        housenumber: "",
        osmId: null
      },

      //if there was an error, display it
      error: null,

      //if we are currently still loading from the address api
      loading: false,

      //check if geolocation is supported at all
      geolocationSupported: "geolocation" in navigator
    }
  },
  created() {
    //create a debounced version of the address update
    this.onAddressChange = debounce(() => this.changeAddress(), 1000)
  },
  methods: {
    //fetch a new osm id
    async changeAddress() {
      //start loading indicator
      this.loading = true

      //catch any errors that occur
      try {
        //fetch a new osm id for this address
        this.address = Object.assign({}, await updateOSMId(this.address))

        //reset error if not thrown
        this.error = null
      } catch (error) {
        //set error state with message
        this.error = error
      } finally {
        //finished loading one way or another
        this.loading = false
      }
    },

    //gets the address for the current browser location from an api
    async fetchAddress() {
      //set to start loading
      this.loading = true

      //catch any errors that arise from the api calls
      try {
        //get the address with the current browser location from the api
        this.address = Object.assign({}, await getAddress())

        //reset error if not thrown
        this.error = null
      } catch (error) {
        //set error state with message
        this.error = error
      } finally {
        //finished loading the address one way or another
        this.loading = false
      }
    }
  }
}
</script>
