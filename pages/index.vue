<template>
  <div>
    <h1 class="headline">
      Vodafone Service Availability Map Creator
    </h1>
    <p>
      This small app will make calls to a Vodafone API to figure out the
      availability of their different services in your area. Enter an address to
      start the query from or use your current location.
    </p>
    <address-select @id-update="originOsmId = $event" />
    <target-select
      :origin-osm-id="originOsmId"
      @address-data="addressesUpdated"
    />
    <query-api ref="queryApi" :addresses="addresses" />
    <h4 class="title mt-4">Attributions</h4>
    <p>
      The reverse location lookup API is provided by
      <a href="https://locationiq.com" targer="_blank">LocationIQ</a>
      <br />
      The address query api through the Overpass API is provided by
      <a :href="overpassApiUrl" targer="_blank">{{ overpassApiUrl }}</a>
      <br />
      Map data is provided by
      <a href="https://www.openstreetmap.org" targer="_blank">OpenStreetMap</a>
      <br />
      GitHub repository for this project:
      <a :href="packageRepoUrl" targer="_blank">{{ packageRepoUrl }}</a>
    </p>
  </div>
</template>

<script>
import { overpassApiUrl } from "~/util/axiosInstances"
import AddressSelect from "~/components/AddressSelect"
import TargetSelect from "~/components/TargetSelect"
import QueryApi from "~/components/QueryApi"

export default {
  components: {
    AddressSelect,
    TargetSelect,
    QueryApi
  },
  data() {
    return {
      //the osm id of the selected address
      originOsmId: null,

      //the queried address data
      addresses: null,

      //the overpass api url to attribute
      overpassApiUrl,

      //the repo information to display in the attributions
      packageRepoUrl: process.env.buildVersion.packageRepoUrl
    }
  },
  methods: {
    //on address update
    addressesUpdated($event) {
      //copy the data
      this.addresses = $event

      //notify the service query component
      this.$refs.queryApi.addressesUpdated()
    }
  }
}
</script>
