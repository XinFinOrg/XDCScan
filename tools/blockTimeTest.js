var Web3 = require("xdc3-old");;
var web3;
var config = require('./../config.json')

var grabBlocks = function(config) {
    web3 = new Web3(new Web3.providers.HttpProvider(config.rpc));
    listenBlocks(config, web3);
}

var listenBlocks = function(config, web3) {
    var lastBlockNum = web3.eth.blockNumber;
    var newBlocks = web3.eth.filter("latest");
    newBlocks.watch(function (error, log) {
        //console.log("watch log:", log);
        if(error) {
            console.log('Error: ' + error);
        } else if (log == null) {
            //console.log('Warning: null block hash');
        } else {
	    
            blD = web3.eth.getBlock(log);
            console.log(blD.timestamp+"::"+Date.parse(new Date())/1000+blD.number);
        }

    });
}


grabBlocks(config);

