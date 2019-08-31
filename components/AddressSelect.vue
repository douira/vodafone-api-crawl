<template>
  <div>
    <h4 class="title">Select an address as the starting point</h4>
    <div class="mt-3 mb-2">
      <v-alert v-if="error" type="error" border="left">
        An error occurred while fetching geo data:
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
    <v-layout row wrap class="pa-1 pt-0">
      <v-flex xs12 sm6 md3 lg3 class="px-2 py-1">
        <v-text-field
          v-model="address.postcode"
          label="Postcode"
          @input="onAddressChange"
        />
      </v-flex>
      <v-flex xs12 sm6 md4 lg3 class="px-2 py-1">
        <v-text-field
          v-model="address.street"
          label="Street"
          @input="onAddressChange"
        />
      </v-flex>
      <v-flex xs12 sm6 md2 lg3 class="px-2 py-1">
        <v-text-field
          v-model="address.housenumber"
          label="Housenumber"
          @input="onAddressChange"
        />
      </v-flex>
      <v-flex xs12 sm6 md3 lg3 class="px-2 py-1">
        <v-text-field
          v-model="address.osmId"
          label="OSM Way ID"
          type="number"
          @input="onIdChange"
        />
      </v-flex>
    </v-layout>
  </div>
</template>

<script>
import { getLocationAddress, updateOSMId, updateAddress } from "~/util/geo"
import { makeApiCallHandlers } from "~/util/util"
import debounce from "debounce-promise"
import { async } from "q"

export default {
  data() {
    return {
      //the address result as received from the api
      address: {
        postcode: "",
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
  watch: {
    "address.osmId": function(osmId) {
      //emit the new value for the parent to use
      this.$emit("id-update", osmId)
    }
  },
  created() {
    //create a debounced version of the address update
    this.onAddressChange = debounce(() => this.changeAddress(), 1000)
    this.onIdChange = debounce(() => this.changeId(), 1000)
  },
  methods: {
    //attach handlers for async api calls
    ...makeApiCallHandlers({
      //fetch a new osm id for this address
      changeAddress: async function() {
        this.address = await updateOSMId(this.address)
      },

      //update the address from a changed osm id
      changeId: async function() {
        this.address = await updateAddress(this.address.osmId)
      },

      //get the address with the current browser location from the api
      fetchAddress: async function() {
        this.address = await getLocationAddress()
      }
    })
  }
}
</script>
