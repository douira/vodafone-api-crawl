//wraps a async function in a loading and error handler
export const makeApiCallHandlers = promiseGenerators => {
  //for all handlers to make
  for (const name in promiseGenerators) {
    //get a reference to the promise generator function
    const generator = promiseGenerators[name]

    //replace with a function that also does error and loading
    promiseGenerators[name] = async function(...args) {
      //start loading indicator
      this.loading = true

      //catch any errors that occur
      try {
        //wait for the generated promise to complete
        await generator.apply(this, args)

        //reset error if not thrown
        this.error = null
      } catch (error) {
        //set error state with message
        this.error = error
        console.error(error)
      } finally {
        //finished loading one way or another
        this.loading = false
      }
    }
  }

  //return the generated handlers
  return promiseGenerators
}

//does a simple regex match and returns false if it doesn't match at all
export const matchRegex = (str, regex) =>
  //handle defaults, with no match [0] leads to error
  ((str || "").match(regex) || [false])[0]

//generates a cache key for an address object
export const makeAddressCacheKey = (addressData, seperator = "_") =>
  [addressData.postcode, addressData.street, addressData.housenumber].join(
    seperator
  )

//the maximum key and data sized allowed in the cache,
//calls with larger data or keys will be ignored
const maxCacheKeySize = 500
const maxCacheDataSize = 20000

//sets cache items
export const setCache = (key, data) => {
  //stringify the data for setting in the cache
  data = JSON.stringify(data)

  //if it exceeds the limits
  if (
    (key && key.length > maxCacheKeySize) ||
    (data && data.length > maxCacheDataSize)
  ) {
    return
  }

  //normally set in the cache
  localStorage.setItem(key, data)
}

//gets cache items
export const getCache = key => {
  //stop if the key exceeds the max length
  if (key && key.length > maxCacheKeySize) {
    return
  }

  //get the item from the cache
  const data = localStorage.getItem(key)

  //return the data parsed if possible
  return data ? JSON.parse(data) : undefined
}
