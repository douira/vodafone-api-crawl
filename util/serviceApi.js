import { ownServer } from "~/util/axiosInstances"
import { makeAddressCacheKey, getCache, setCache } from "~/util/util"

//queries the service api for one address
export const getAddressStatus = async address => {
  //make a cache key for this address request
  const cacheKey = `q_${makeAddressCacheKey(address)}`

  //get a cache result
  const cacheResult = getCache(cacheKey)

  //return that instead if available
  if (cacheResult) {
    return cacheResult
  }

  //make the request with the address
  const { data } = await ownServer.post("/", address)

  //cache the result
  setCache(cacheKey, data)

  //return the calculated result
  return data
}
