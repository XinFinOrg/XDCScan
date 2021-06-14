const getQuote = require( './coinMarketPrice.js' ).getQuote;
const _ = require('lodash');

var config = { nodeAddr: 'localhost', gethPort: 8545, bulkSize: 100 };
try {
    var local = require('../config.json');
    _.extend(config, local);
    console.log('config.json found.');
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        var local = require('../config.example.json');
        _.extend(config, local);
        console.log('No config file found. Using default configuration... (config.example.json)');
    } else {
        throw error;
    }
}


async function callshiet(){
        return await getQuote("BTC", config.CMC_API_KEY);
}

var data = await callshiet();


getQuote("BTC", config.CMC_API_KEY).then(
    value =>{
        //console.log(value);
        return value;
    
    }
).catch(
    err => {console.log(err);
            return err.json();
            }
);

console.log(data);