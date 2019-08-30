import * as pkg from "./package"
import getVersion from "./util/version"
import consola from "consola"

//get dev env
const dev = process.env.NODE_ENV !== "production"

//only add `router.base = '/<repository-name>/'` if `DEPLOY_ENV` is `GH_PAGES`
const routerBase =
  process.env.DEPLOY_ENV === "GH_PAGES"
    ? {
        router: {
          base: `/${pkg.name}/`
        }
      }
    : {}

//get version and log
const buildVersion = getVersion(dev)
consola.info(`Build version is ${buildVersion.formatted}`)

export default {
  //allow for static generation
  mode: "spa",

  //use different router when generating for ghpages
  ...routerBase,

  //setup dev env
  env: {
    //define the version variable to allow display of the built version
    buildVersion,

    //dev env
    dev
  },

  //Headers of the page
  head: {
    title: "Vodafone Availability API",
    meta: [
      { charset: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      },
      {
        hid: "description",
        name: "description",
        content: pkg.description
      }
    ]
  },

  css: ["~/assets/style/global.css"],

  //Plugins to load before mounting the App
  plugins: ["~/plugins/bus"],

  vuetify: {
    optionsPath: "~/util/vuetify.options.js",
    defaultAssets: { font: true, icons: "mdi" }
    //customVariables: ["~/assets/style/variables.scss"],

    //always enable to allow changing of SCSS variables
    //treeShake: true
  },

  //include vuetify as a module
  buildModules: ["@nuxtjs/vuetify"],

  //Build configuration
  modern: true,
  build: {
    parallel: true,
    cache: true
  }
}
