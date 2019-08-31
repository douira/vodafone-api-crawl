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
      @address-data="addresses = $event"
    />
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

export default {
  components: {
    AddressSelect,
    TargetSelect
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
  }
}
</script>
