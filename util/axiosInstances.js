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
  baseURL: overpassApiUrl,
  credentials: false
})

//api for querying the availability api
export const serviceApiInstance = axios.create({})
