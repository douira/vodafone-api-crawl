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
