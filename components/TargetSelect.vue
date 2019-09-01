<template>
  <div>
    <h4 class="title mb-3">Query targets within a radius</h4>
    <v-alert v-if="error" type="error" border="left">
      An error occurred while querying the overpass API:
      {{ error.message }}
    </v-alert>
    <v-slider
      v-model="sliderValue"
      prepend-icon="mdi-radius-outline"
      :max="1000"
      :thumb-size="40"
      @input="dataUpdated = false"
    >
      <template #thumb-label>{{ formattedRadius }}</template>
    </v-slider>
    <p>
      All addresses around the selected origin within a
      {{ formattedRadius }} radius will be queried.
    </p>
    <v-btn color="primary" :disabled="!originOsmId" @click="getTargets">
      <v-icon left>mdi-map-marker-radius</v-icon>
      Start query
    </v-btn>
    <v-progress-circular
      v-show="loading"
      indeterminate
      class="ml-4"
      color="primary"
      :size="30"
    />
    <v-alert
      v-if="dataUpdated && addresses"
      type="success"
      class="mt-4"
      border="left"
    >
      Found {{ addresses.length }} address{{
        addresses.length === 1 ? "" : "es"
      }}
      within {{ formattedRadius }} of the origin.
    </v-alert>
  </div>
</template>

<script>
import { getAddressesInRadius } from "~/util/geo"
import { makeApiCallHandlers } from "~/util/util"

export default {
  props: {
    //the osm id of the node to query around
    originOsmId: { type: String, default: null }
  },
  data() {
    return {
      //the current value of the slider
      sliderValue: 5,

      //if we are currently querying
      loading: false,

      //an error we might have had during loading
      error: null,

      //if the addresses have been queried for the current radius
      dataUpdated: false,

      //the current addresses as calculated from the api
      addresses: null
    }
  },
  computed: {
    //calculates the real radius in meters being used
    radius() {
      return Math.round(this.sliderValue ** 2 / 10)
    },

    //displays the radius formatted as text
    formattedRadius() {
      //choose unit depending on value range
      return this.radius < 1000
        ? `${this.radius}m`
        : this.radius < 10000
        ? `${(this.radius / 1000).toFixed(1)}km`
        : `${Math.round(this.radius / 1000)}km`
    }
  },
  watch: {
    //on change of the id reset the updated status
    originOsmId() {
      this.dataUpdated = false
    }
  },
  methods: {
    //construct async api methods
    ...makeApiCallHandlers({
      //get the list of addresses to check
      getTargets: async function() {
        //calculate the addresses
        this.addresses = await getAddressesInRadius(
          this.originOsmId,
          this.radius
        )

        //set updated to true as data is present now
        this.dataUpdated = true

        //emit the data as well
        this.$emit("address-data", this.addresses)
      }
    })
  }
}
</script>
