const fetch = require("node-fetch");
module.exports = {
    getQuote    : async function (symbol, cmc_api_key){
        const options = {
            timeout: 3000
        }
        const URL = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}&CMC_PRO_API_KEY=${cmc_api_key}`;

        try {
            let requestUSD = await fetch(URL);
            let requestBTC = await fetch(URL + '&convert=BTC');
            let quoteUSD = await requestUSD.json();
            let quoteBTC = await requestBTC.json();
            
            console.log(quoteUSD);

            if(quoteUSD.status.error_code != 0){
                return null;
            }

            // console.log(quoteUSD[]);
            quoteObject = {
                symbol: symbol,
                timestamp: Math.round(new Date(quoteUSD.status.timestamp).getTime() / 1000),
                quoteBTC: quoteBTC.data[symbol].quote.BTC.price,
                quoteUSD: quoteUSD.data[symbol].quote.USD.price,
                volume_24h:quoteUSD.data[symbol].quote.USD.volume_24h,
                percent_change_24h: quoteUSD.data[symbol].quote.USD.percent_change_24h,
            }
            // console.log(quoteObject);
            return quoteObject;
        } catch (error) {
            console.log(error);
            return null;
        }
    }
};