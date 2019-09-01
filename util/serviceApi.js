import { serviceApiInstance } from "~/util/axiosInstances"

//queries the service api for one address
export const getAddressStatus = async address => {
  const time = parseInt(address.housenumber, 10)
  if (!time) {
    throw "invalid time from housenumber"
  }
  await new Promise(resolve => setTimeout(() => resolve, time * 10))
}
