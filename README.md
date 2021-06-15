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

First you have to run the following to update the current database:
fill_token_holders is for update holders to DB when it partially synced and does not want to delete data and resync 
`node ./tools/fill_token_holders.js`

sync_all_contract_from_token_transfer is for update contracts that not synced yet for better experience and it will be writting some additional infomation when sync or patcher run to specific block 
`node ./tools/sync_all_contract_from_token_transfer.js`
