//adapted from from https://github.com/shalvah/simple-cors-escape/blob/e7e6dc0fe31d79670febfbd93ab8b5f9c7b97e00/index.js
/*const request = require("request")
const http = require("http")
const port = process.env.PORT || 3001

let getPostData = request => {
  return new Promise(resolve => {
    let post = ""
    if (request.method === "POST") {
      let body = ""
      request.on("data", data => {
        body += data
      })

      request.on("end", () => {
        post = JSON.parse(body)
        resolve(post)
      })
    }
  })
}

http
  .createServer(function(req, res) {
    console.log("Server running on port " + port)
    console.log(`Request to: ${req.url}`)
    getPostData(req).then(body => {
      console.log(body)

      request(
        {
          uri: req.url,
          headers: req.headers,
          method: req.method
        },
        (proxyErr, proxyRes, proxyBody) => {
          if (proxyErr) {
            console.log(proxyErr)
            res.statusCode = 500
            res.write(proxyErr)
          } else {
            res.writeHead(proxyRes.statusCode, proxyRes.headers)
            res.write(proxyBody)
          }
          res.end()
        }
      )
    })
  })
  .listen(port)
*/
const http = require("http")
const httpProxy = require("http-proxy")
const port = process.env.PORT || 3001
const proxy = httpProxy
  .createProxyServer()
  .on("proxyRes", (proxyRes, req, res) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin)
    res.setHeader("Access-Control-Allow-Credentials", true)
  })

http
  .createServer(function(req, res) {
    console.log(req.headers)
    if (req.method === "OPTIONS") {
      if (req.headers["access-control-request-method"]) {
        res.setHeader(
          "access-control-allow-methods",
          req.headers["access-control-request-method"]
        )
      }
      if (req.headers["access-control-request-headers"]) {
        res.setHeader(
          "access-control-allow-headers",
          req.headers["access-control-request-headers"]
        )
      }
      if (req.headers.origin) {
        res.setHeader("access-control-allow-origin", req.headers.origin)
        res.setHeader("access-control-allow-credentials", "true")
      }
      res.writeHead(200)
      res.end()
      return
    }
    proxy.web(req, res, {
      target: req.url.slice(1),
      changeOrigin: true
    })
  })
  .listen(port)

console.log(`CORS-allow proxy server listening on port ${port}`)
