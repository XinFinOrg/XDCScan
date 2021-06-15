const getQuote = require( './coinMarketPrice.js' ).getQuote;
const config = require('./config');

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