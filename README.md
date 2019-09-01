# vodafone-api-crawl
> **vodafone-api-crawl** crawls the vodafone api for service availability data

# Usage
## Running from on the command line
```bash
# install dependencies
$ npm install

# serve with hot reload at localhost:3000
$ npm run dev

# build for production and launch server
$ npm run build
$ npm start

# generate static project for display on github pages
$ npm run generate-ghpages

# start the local proxy server
$ pm2 start proxyServer.js -l /dev/null

# optionally start without logging
$ pm2 

# you might want to flush the logs sometimes
$ pm2 flush
```

Sadly this doesn't fully work on GitHub pages since you need to start your own CORS proxy for this to work.
