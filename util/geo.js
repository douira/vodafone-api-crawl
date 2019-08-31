import { xml2js } from "xml-js"
import { locationIQ, overpass } from "~/util/axiosInstances"

//generates a cache key for an address object
const makeAddressCacheKey = addressData =>
  `${addressData.zipcode}_${addressData.street}_${addressData.housenumber}`

//sets cache items
const setCache = (key, data) => localStorage.setItem(key, JSON.stringify(data))

//gets cache items
const getCache = key => {
  //get the item from the cache
  const data = localStorage.getItem(key)

  //return the data parsed if possible
  return data ? JSON.parse(data) : undefined
}

//returns a promise to get the location from the browser
const currentCoordinates = () =>
  //make a new promise to wrap the getting of the location which uses callback
  new Promise((resolve, reject) => {
    //try to get the location from the browser
    navigator.geolocation.getCurrentPosition(
      //get coords from location
      ({ coords }) => resolve(coords),

      //reject on denying location
      error => reject(error)
    )
  })

//gets the current address
export const getAddress = async () => {
  //get the current location from the browser
  const { latitude, longitude } = await currentCoordinates()

  //make a string key from the lat and lon values we're looking up
  const cacheKey = `${latitude}_${longitude}`

  //if it exists in the cache
  const cacheResult = getCache(cacheKey)
  if (cacheResult) {
    //return the cache result instead of fetching it again
    return cacheResult
  }

  //get the address for the current location
  const {
    data: { address, osm_id: osmId }
  } = await locationIQ.get(
    "reverse.php",

    //pass location data to the api, limit to Germany
    { params: { lat: latitude, lon: longitude, countrycodes: "de" } }
  )

  //error if the country is not Germany
  if (address.country !== "Germany") {
    throw Error("Address must be in Germany")
  }

  //construct the location information from the response
  const addressData = {
    zipcode: address.postcode || "",
    street: address.road || "",

    //house number might be multiple sometimes, choose only the first given
    housenumber: address.house_number
      ? address.house_number.match(/\d+/)[0]
      : "",

    //also save the osm id
    osmId
  }

  //cache the data with the previously generated key
  setCache(cacheKey, addressData)

  //also cache by address
  setCache(makeAddressCacheKey(addressData), addressData)

  //return the data
  return addressData
}

//updates the osm id with the given address
export const updateOSMId = async address => {
  //make a cache key for this address
  const cacheKey = makeAddressCacheKey(address)

  //use cache data if available
  const cacheResult = getCache(cacheKey)
  if (cacheResult) {
    return cacheResult
  }

  //get the address for the current location
  const {
    data: [{ osm_id: osmId }]
  } = await locationIQ.get(
    "search.php",

    //pass location data to the api, limit to Germany
    {
      params: {
        q: `${address.zipcode}, ${address.street}, ${address.housenumber}`
      }
    }
  )

  //apply the new osm id
  address.osmId = osmId

  //cache the result
  setCache(cacheKey, address)

  //and also return the result
  return address
}

//queries the overpass api as a promise
const queryOverpass = async (query, options) => {
  //query the api
  const { data } = await overpass.post("/", query)

  //parse the xml
  return xml2js(data)
}

//find all addresses within a radius around a given origin
export const getAddressesInRadius = async (originId, radius) => {
  return await queryOverpass(`node
    [railway=station]
    (around:5000,52.5164,13.3777);
  out;`)
}
