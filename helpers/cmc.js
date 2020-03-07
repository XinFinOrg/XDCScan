const axios = require("axios");
const cmcKeys = require("../config/cmcKeys");

module.exports = {
  getCMCData: async () => {
    try{
      const cmc_xdc_data = await axios({
        method:"get",
        headers: {
          'X-CMC_PRO_API_KEY': cmcKeys.xdce.key
        },
        url: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
        params: {
          'id': cmcKeys.xdce.id
        },
      });
      return cmc_xdc_data;
    }catch(e){
      console.log("exception at helpers.cmc: ", e);
      return null;
    }
    
  }
}