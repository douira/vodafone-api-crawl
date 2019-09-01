import axios from "axios"

//the token
const loocationIQAccess = "65302e414da20f"

//make a instance with some data prefilled
export const locationIQ = axios.create({
  //the api location
  baseURL: "https://eu1.locationiq.com/v1",

  //fill in api key and format in the params
  params: {
    key: loocationIQAccess,
    format: "json"
  }
})

//the baseurl to use for the overpass api
//"https://overpass-api.de/api/interpreter"
//"https://overpass.kumi.systems/api/interpreter"
export const overpassApiUrl = "https://overpass-api.de/api/interpreter"

//overpass api instance
export const overpass = axios.create({
  baseURL: overpassApiUrl
})

//basic settings for service api
const serviceApiSettings = {
  //use locally hosted cors proxy
  baseURL: "http://localhost:3001/https://zuhauseplus.vodafone.de/",

  //allow cookies
  withCredentials: true
}

//api for querying the availability api
export const serviceApiInstance = axios.create({
  //set the api key
  headers: {
    Authorization:
      "Basic V1dXOnNlZV8vZ2ltbGkvaW5mb19mb3JfQVBJX2FjY2Vzc19kZXRhaWxz",
    Accept: "application/vnd.kabeldeutschland.gimli-v4+json"
  },

  //extend default options
  ...serviceApiSettings
})

//api for querying the DSL availability api
export const serviceApiDSLInstance = axios.create({
  //set the api key differently
  headers: {
    Authorization: "QgtHm7esuKN8Na0MWWpodE0lAqKh9cTb"
  },

  //extend default options
  ...serviceApiSettings
})
