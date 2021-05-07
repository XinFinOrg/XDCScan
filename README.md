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



### update by LucVu
About XDC Price at Market: I have created an API that get the current price of XDC get from CoinMarketCap.com 
                just go to {xdcscan_url}/publicAPIDoc#marketprice and you will see detail about this

About Token(TotalHolders, Holders, TokenInfo, TotalSupply, TokenTransfers ...):
    I have created an API that get the current price of XDC get from CoinMarketCap.com 
    just go to {xdcscan_url}/publicAPIDoc#marketprice and you will see detail about this

New implementation code: Dev can see the change in git commit if anything that hard to understand you guys could ask me then

### Before using Token APIs: 
- I have create new table in mongodb called TokenHolder dont worry the process of creating it is automatic
- You will need to run the command: `node tools/fill_token_holders.js`
Why do you need this? - Of course i have write the function to sync newly transfer tokens but the old one when blocks already synced ? => i have to do it seperatly in order to sync the old one and this is onetime operating because new one will be added when syncing blocks

- Again: just run `node tools/fill_token_holders.js` and things will be fine - you could run it multiple time but i will not have any more effect than the first time