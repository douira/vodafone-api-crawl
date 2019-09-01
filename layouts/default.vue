<template>
  <v-app>
    <v-content class="mb-3">
      <v-container>
        <nuxt />
      </v-container>
    </v-content>
    <v-footer absolute height="auto" class="px-2">
      <v-row no-gutters justify="space-between" class="body-2">
        <span
          >&copy;
          <a :href="buildVersion.packageRepoUrl" target="_blank">
            {{ copyrightRange }}
          </a>
        </span>
        <a
          :href="buildVersion.commitUrl"
          target="_blank"
          class="grey--text text--lighten-1 no-underline"
        >
          {{ buildVersion.formatted }}
        </a>
      </v-row>
    </v-footer>
  </v-app>
</template>

<script>
export default {
  data() {
    return {
      //save the build version data from the webpack build
      buildVersion: process.env.buildVersion,

      //from what whole year the copyright range should start
      copyrightRangeStart: 2019
    }
  },
  computed: {
    //generates the copright range string using the current year
    copyrightRange() {
      //get the current year
      const year = new Date().getFullYear()

      //only single year if still the same
      return this.copyrightRangeStart === year
        ? year
        : `${this.copyrightRangeStart} - ${year}`
    }
  }
}
</script>

<style scoped>
/*removes underline styling*/
.no-underline {
  text-decoration: none;
}
</style>
