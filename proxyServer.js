const express = require("express")
const request = require("request")

//start message
console.log("CORS-allow proxy server starting...")

//get the port and host
const port = process.env.PORT || 3001
const host = process.env.HOST || "localhost"

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

  //on all remaining requests, simply pipe it to the target
  .all("/*", (req, res) =>
    //the target is the remaining part without the slash
    req.pipe(request(req.url.slice(1))).pipe(res)
  )

  //start the server with given port and host
  .listen(port, host, () =>
    //log a listening message
    console.log(`CORS-allow proxy server listening on port ${port}`)
  )
