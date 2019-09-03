const axios = require("axios")
const io = require("socket.io")()
const PromisePool = require("es6-promise-pool")

//start message
console.log("api requests server starting...")

//get the port and host
const port = process.env.PORT || 3001

//the list of cable products we're interested in
const cableProductsQuery = [
  "tv-basic",
  "ki100-business-neu",
  "ki1000-business-50mbit",
  "ki200-business-neu",
  "ki32-hotspot-business-basis",
  "ki400-business",
  "ki50-business-4mbit",
  "ki500-business",
  "kip10",
  "kip100",
  "kip1000-50mbit",
  "kip400-v",
  "kip50",
  "kip500",
  "kp"
].join(",")

//regex that matches the dsl or lte speed as the first group
const speedMatchRegex = {
  dsl: /DSL.*?(\d+)/,
  lte: /LTE.*?(\d+)/
}

//find the fastest product that matches in a list of products
const findMaxProduct = (products, regex) =>
  products.reduce((max, product) => {
    //try to match the id
    const match = product.id.match(regex)

    //if there is a match
    if (match && match[1]) {
      //parse the speed from the match group
      const speed = parseInt(match[1], 10)

      //return the maximum speed
      return Math.max(speed, max)
    }

    //return max unchanged
    return max
  }, 0)

//basic settings for service api
const serviceApiSettings = {
  //use service api
  baseURL: "https://zuhauseplus.vodafone.de/",

  //allow setting and sending cookies
  withCredentials: true
}

//api for querying the availability api
const serviceApiInstance = axios.create({
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
const serviceApiDslInstance = axios.create({
  //set the api key differently
  headers: {
    Authorization: "QgtHm7esuKN8Na0MWWpodE0lAqKh9cTb"
  },

  //extend default options
  ...serviceApiSettings
})

//makes the api service requests
const queryAddress = async address => {
  //do a handshake to get the cookie we need to set
  const {
    data: {
      data: { APIstate: cookie }
    }
  } = await serviceApiInstance.get("gimli/handshake")

  //construct the config object that sets the cookie
  const cookieConfig = {
    headers: {
      Cookie: `APIstate=${cookie}`
    }
  }

  //get address id for given address from api
  const {
    data: {
      data: { addresses }
    }
  } = await serviceApiInstance.post(
    "gimli/customer/addressvalidation",
    {
      //the address data in the api specific format
      zipcode: address.postcode,
      street: address.street,
      housenumber: address.housenumber
    },
    cookieConfig
  )
  //get the api internal address
  const internalAddress = addresses[0]

  //get the address api id
  const addressId = internalAddress.addressId

  //throw to abort if address id is invalid
  if (!addressId) {
    throw Error("api address ")
  }

  //set the address id in the current api state
  const {
    data: {
      data: { valid: validAddress }
    }
  } = await serviceApiInstance.post(
    "gimli/customer/serviceaddress",
    {
      //pass the gotten address id
      addressid: addressId
    },
    cookieConfig
  )

  //throw to abort if not valid
  if (!validAddress) {
    throw Error("api address id not accepted by api")
  }

  //do these three at once since they don't depend on eachother
  const [
    { data: dslProducts },
    {
      data: {
        data: { valid: cableMarketingValid, marketabilityInfo: cableMarketing }
      }
    },
    {
      data: {
        data: { products: cableProducts }
      }
    }
  ] = await Promise.all([
    //get DSL products for address
    serviceApiDslInstance.get(
      `/service/proxy/products/97498552/${
        internalAddress.zipcode
      }/${encodeURIComponent(internalAddress.city)}/${encodeURIComponent(
        internalAddress.district
      )}/${encodeURIComponent(internalAddress.street)}/${encodeURIComponent(
        internalAddress.housenumber + (internalAddress.housenumberextra || "")
      )}`,
      cookieConfig
    ),

    //get cable marketing info
    serviceApiInstance.get("gimli/customer/marketability", cookieConfig),

    //get cable products info
    serviceApiInstance.get("gimli/product/availability", {
      //pass the products list
      params: {
        products: cableProductsQuery
      },
      ...cookieConfig
    })
  ])

  //throw if cable info invalid
  if (!cableMarketingValid) {
    throw Error("cable marketing info invalid")
  }

  //parse service information from the data
  return {
    //determine what the max available cable speed if
    maxCableSpeed: parseInt(
      cableMarketing.objectTag.vermarktbareDatentransferrate,
      10
    ),

    //determine the max dsl and lte speeds
    maxDslSpeed: findMaxProduct(dslProducts, speedMatchRegex.dsl) / 1000,
    maxLteSpeed: findMaxProduct(dslProducts, speedMatchRegex.lte) / 1000
  }
}

//async function that processes one address
const processAddress = async (socket, address, index) => {
  //send the result of the address query back to the socket
  try {
    //wait for the query to finish and send the result
    socket.emit("response", { index, data: await queryAddress(address) })
  } catch (error) {
    //send an error instead
    socket.emit("response", { index, error })
  }
}

//how many connections are made at once
const concurrency = 30

//on ws connection
io.on("connection", socket => {
  //on sending a job
  socket.on("addresses", addresses =>
    new PromisePool(() => {
      //the next address to process
      let next = 0

      //skip this one if it's a placeholder
      while (addresses.length && next === 0) {
        //get the next one
        next = addresses.pop()
      }

      //stop if there is none
      if (!next) {
        return null
      }

      //return the promise generated from processing the address
      return processAddress(socket, next, addresses.length)
    }, concurrency).start()
  )
})

//start listening
io.listen(port)
