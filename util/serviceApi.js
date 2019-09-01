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
  const {
    data: {
      data: { addresses }
    }
  } = await serviceApiInstance.post("gimli/customer/addressvalidation", {
    //the address data
    zipcode: address.postcode,
    street: address.street,
    housenumber: address.housenumber
  })

  //attach the api id of the first gotten address
  address.apiId = addresses[0].addressId

  //set the address id in the current api state
  const {
    data: {
      data: { valid }
    }
  } = await serviceApiInstance.post("gimli/customer/addressvalidation", {
    //pass the gotten address id
    addressId: address.apiId
  })

  //throw to abort if not valid
  if (!valid) {
    throw Error("api address id not accepted by api")
  }

  console.log(addresses)
  //set address id in the api
  //get DSL products for address
  //get cable marketing data for address
  //get cable products for address
}
