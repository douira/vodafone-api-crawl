import {
  serviceApiInstance,
  serviceApiDSLInstance
} from "~/util/axiosInstances"

//placeholder that uses the housenumber to wait a while
/*
const time = parseInt(address.housenumber, 10)
  if (!time) {
    throw "invalid time from housenumber"
  }
  await new Promise(resolve => setTimeout(resolve, time * 10))
*/

//queries the service api for one address
export const getAddressStatus = async address => {
  //get address id for given address from api
  const { data } = await serviceApiInstance.post(
    "gimli/customer/addressvalidation",
    {
      //the address data
      zipcode: address.postcode,
      street: address.street,
      housenumber: address.housenumber
    }
  )
  console.log(data)
  //set address id in the api
  //get DSL products for address
  //get cable marketing data for address
  //get cable products for address
}
