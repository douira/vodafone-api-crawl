import LRU from "lru-cache"
import { locationIQ } from "~/util/axiosInstances"

//generates a cache key for an address object
const makeAddressCacheKey = addressData =>
  `${addressData.zipcode}_${addressData.street}_${addressData.housenumber}`

//make a new lru cache for caching the location requests
const locationIQAddressCache = new LRU({ max: 100 })

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
  const cacheResult = locationIQAddressCache.get(cacheKey)
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
  locationIQAddressCache.set(cacheKey, addressData)

  //also cache by address
  locationIQAddressCache.set(makeAddressCacheKey(addressData), addressData)

  //return the data
  return addressData
}

//updates the osm id with the given address
export const updateOSMId = async address => {
  //make a cache key for this address
  const cacheKey = makeAddressCacheKey(address)

  //use cache data if available
  const cacheResult = locationIQAddressCache.get(cacheKey)
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
  locationIQAddressCache.set(cacheKey, address)

  //and also return the result
  return address
}
