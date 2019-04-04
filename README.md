# XinFinScan 

## Local installation

Clone the repo

Download [Nodejs and npm](https://docs.npmjs.com/getting-started/installing-node "Nodejs install") if you don't have them

Install dependencies:

`npm install`

Install mongodb:

MacOS: `brew install mongodb`

Centos: `yum install -y mongodb`

Ubuntu: `sudo apt-get install -y mongodb-org`


## Config RPC and Populate the DB

This will fetch and parse the entire blockchain.

modify the var "config" (near the file end) like follow basic settings:
--------------
    var config = 
    {
        "rpc": 'http://localhost:8545',
        "blocks": [ {"start": 0, "end": "latest"}],
        "quiet": true,
        "terminateAtExistingDB": false,
        "listenOnly": false,//false:graber interval. true:grabe by listen new block.
        "out": "."
    };

