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
    <target-select :origin-osm-id="originOsmId || undefined" />
    <h4 class="title">Attributions</h4>
    <p>
      The reverse location lookup API is provided by
      <a href="https://locationiq.com" targer="_blank">
        LocationIQ.
      </a>
    </p>
  </div>
</template>

<script>
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
      originOsmId: null
    }
  }
}
</script>
