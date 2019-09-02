const express = require("express")
const axios = require("axios")

//start message
console.log("api requests server starting...")

//get the port and host
const port = process.env.PORT || 3001
const host = process.env.HOST || "localhost"

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

//make an express instance
express()
  //on all requests set all the CORS headers
  .use((req, res, next) => {
    if (req.headers["access-control-request-method"]) {
      res.set(
        "access-control-allow-methods",
        req.headers["access-control-request-method"]
      )
    }
    if (req.headers["access-control-request-headers"]) {
      res.set(
        "access-control-allow-headers",
        req.headers["access-control-request-headers"]
      )
    }
    if (req.headers.origin) {
      res.set("access-control-allow-origin", req.headers.origin)
      res.set("access-control-allow-credentials", "true")
    }
    next()
  })

  //on options requests just satisfy the browser
  .options("*", (req, res) => res.status(200).end())

  //enable body parsing
  .use(express.json())

  //on all post requests
  .post("*", async (req, res, next) => {
    //handle request errors
    try {
      //wait on the requests to finish and return the data
      res.json(await queryAddress(req.body))
    } catch (err) {
      //handle error in express
      next(err)
    }
  })

  //error handler
  //eslint-disable-next-line no-unused-vars
  .use(function(err, req, res, next) {
    //make the error response
    const errorResponse = {
      err: err.stack
    }

    //attach body and headers if response present
    if (err.response) {
      errorResponse.data = err.response.data
      errorResponse.headers = err.response.headers
    }

    //log the error
    console.error(errorResponse)

    //send the error as the content of the error response
    res.status(500).json(errorResponse)
  })

  //start the server with given port and host
  .listen(port, host, () =>
    //log a listening message
    console.log(`api requests server listening on port ${port}`)
  )
