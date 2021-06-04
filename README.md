# XDCScan Explorer

## Local installation

Clone the repo

Download [Nodejs and npm](https://docs.npmjs.com/getting-started/installing-node "Nodejs install") if you don't have them

Install dependencies:

`npm install`

Install mongodb:

MacOS: `brew install mongodb`

Ubuntu: `sudo apt-get install -y mongodb-org`

### Run:
The below will start both the web-gui and sync.js (which populates MongoDB with blocks/transactions).
`npm run dev`

You can leave sync.js running without app.js and it will sync and grab blocks based on config.json parameters
`node ./tools/sync.js`

