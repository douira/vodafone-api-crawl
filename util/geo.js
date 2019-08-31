import { locationIQ, overpass } from "~/util/axiosInstances"
import { matchRegex } from "~/util/util"

//generates a cache key for an address object
const makeAddressCacheKey = (addressData, seperator = "_") =>
  [addressData.postcode, addressData.street, addressData.housenumber].join(
    seperator
  )

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
export const getLocationAddress = async () => {
  //get the current location from the browser
  const { latitude, longitude } = await currentCoordinates()

  //make a string key from the lat and lon values we're looking up
  //reduce the accuracy to increase the chance of a cache hit
  const cacheKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`

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
    postcode: address.postcode || "",
    street: address.road || "",

    //house number might be multiple sometimes, choose only the first given
    housenumber: matchRegex(address.house_number, /\d+/g) || "",

    //also save the osm id
    osmId
  }

  //cache the data with the previously generated location key
  setCache(cacheKey, addressData)

  //also cache by address and osm id
  setCache(makeAddressCacheKey(addressData), addressData)
  setCache(addressData.osmId, addressData)

  //return the data
  return addressData
}

//queries the overpass api as a promise
const queryOverpass = async query => {
  //query the api and extract the elements
  const { data } = await overpass.post("/", query)

  //return the elements of the query
  return data.elements
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
    { params: { q: makeAddressCacheKey(address, ", ") } }
  )

  //apply the new osm id
  address.osmId = osmId

  //cache the result by the address cache key
  setCache(cacheKey, address)

  //also cache by osm id
  setCache(osmId, address)

  //and also return the result
  return address
}

//parses an address object from a osm element
const parseAddressElement = element => ({
  postcode: element.tags["addr:postcode"],
  street: element.tags["addr:street"],
  housenumber: element.tags["addr:housenumber"]
})

//updates the address with a changed osm id
export const updateAddress = async osmId => {
  //use cache data if available
  const cacheResult = getCache(osmId)
  if (cacheResult) {
    return cacheResult
  }

  //query overpass for the element
  const [element] = await queryOverpass(
    `[out:json][timeout:25];
    (
      node(id:${osmId})["addr:housenumber"];
      way(id:${osmId})["addr:housenumber"];
    );
  out tags;
  `
  )

  //parse an address
  const address = parseAddressElement(element)

  //choose only the first housenumber given
  address.housenumber = matchRegex(address.housenumber, /\d+/g) || ""
  console.log(address)
  //also add the id
  address.osmId = osmId

  //cache the result
  setCache(osmId, address)

  //and also return the result
  return address
}

//the charset of letter to interpolate with
const letterCharset = "abcdefhijklmnopqrstuvwxyz"

//finds the charset index of a start housenumber
const findHousenumberCharsetIndex = str =>
  letterCharset.indexOf(matchRegex(str.toLowerCase(), /[a-z]+/g)[0])

//adds interpolated address objects to the list
const interpolateAddresses = (baseInfo, start, end, type = "all") => {
  //address object accumulator
  const addresses = []

  //for alphabetic interpolation
  if (type === "alphabetic") {
    //split the number and letter part,
    //find the index of the first char in the charset
    const number = matchRegex(start, /\d+/g)
    const startIndex = findHousenumberCharsetIndex(start)
    const endIndex = findHousenumberCharsetIndex(end)

    //for all positions
    for (let i = startIndex; i <= endIndex; i++) {
      //add an object with this housenumber to the list
      addresses.push({
        ...baseInfo,
        housenumber: number + letterCharset[i],
        interpolated: type
      })
    }
  } else {
    //a number interpolation, parse numbers
    start = parseInt(start, 10)
    end = parseInt(start, 10)

    //at first the interval is 1 for all
    let interval = 1

    //the interval is 2 for odd and even
    if (type === "odd" || type === "even") {
      interval = 2
    }

    //try to parse the type as a number
    const parsedInterval = parseInt(type, 10)

    //if it is a number, use that instead
    if (parsedInterval) {
      interval = parsedInterval
    }

    //generate addresses with the interval
    for (let i = start; i <= end; i += interval) {
      //add an object with this housenumber to the list
      addresses.push({ ...baseInfo, housenumber: i, interpolated: type })
    }
  }
  console.log("interpolated", addresses, baseInfo, start, end, type)
  //return the generated list of addresses
  return addresses
}

//adds an address to the list
const addAddress = (list, address) =>
  (list[makeAddressCacheKey(address)] = address)

//adds the result of an interpolation to the list
const addInterpolatedAddresses = (list, ...interpolation) =>
  //do an interpolation with the args and add each one of the result
  interpolateAddresses(...interpolation).forEach(address =>
    addAddress(list, address)
  )

//find all addresses within a radius around a given origin
export const getAddressesInRadius = async (originId, radius) => {
  //an index of the addresses, used to make unique
  const addresses = {}

  //do two queries for normal housenumbers and interpolated ones
  const [addressWays, interpolationElements] = await Promise.all([
    //query the overpass api for ways with a housenumber in the radius
    queryOverpass(
      `[out:json][timeout:25];
    way(id:${originId});
    way(around:${radius})["addr:housenumber"];
    out tags;
    `
    ),
    queryOverpass(
      `[out:json][timeout:25];
    way(id:${originId});
    (
      node(around:${radius})["addr:housenumber"];
      way(around:${radius})["addr:interpolation"];
    );
    out tags;
    `
    )
  ])
  console.log(interpolationElements)
  //map the address ways to readable objects
  addressWays
    .map(element => {
      //make an address object from the element
      const address = parseAddressElement(element)

      //if interpolation info present
      const interpolation = element.tags["addr:interpolation"]
      if (interpolation) {
        //add it to the address
        address.interpolation = interpolation
      }

      //return the address
      return address
    })

    //add all addresses to the index
    .forEach(address => {
      //if something goes wrong, simply log the error and ignore the address
      try {
        //if this is a interpolated range
        if (address.interpolation) {
          //split on range seperator dash
          const components = address.housenumber.split("-")

          //if there are exactly two components
          if (components.length === 2) {
            //add interpolation result and stop
            addInterpolatedAddresses(
              addresses,
              components[0],
              components[1],
              address.interpolation || "all"
            )
            return
          }
        }

        //try to split on regular seperators
        const components = address.housenumber.split(/;|,/g)

        //if the split has more than one component
        if (components.length > 1) {
          //add each component and stop
          components.forEach(component =>
            //add a note that this was from a number list
            addAddress(addresses, {
              ...address,
              housenumber: component,
              seperatedList: true
            })
          )
          return
        }

        //if nothing else happened, simply add it normally
        addAddress(addresses, address)
      } catch (err) {
        console.log("address way error", err, address)
      }
    })

  //the ways are filtered out and then processed
  const interpolationWays = []

  //the nodes are addressed by id in order to retrieve them by the ways
  const interpolationNodes = {}

  //for all interpolation elements, sort them into their categories
  interpolationElements.forEach(element => {
    //if it is a way
    if (element.type === "way") {
      //add it to the array of ways
      interpolationWays.push(element)
    } else {
      //put node in object with key
      interpolationNodes[element.id] = element
    }
  })

  //for all collected ways
  interpolationWays.forEach(way => {
    //
  })

  //return all unique addresses
  return Object.values(addresses)
}
