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
