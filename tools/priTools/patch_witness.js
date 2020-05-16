/**
 * collect transactions, Token Contracts info from blockchain . write to db
 */
require( '../../db.js' );
var config3 = require('./../config.json')

var etherUnits = require("../../lib/etherUnits.js");
var BigNumber = require('bignumber.js');
var Web3 = require("xdc3-old");;
var web3;
var mongoose = require( 'mongoose' );
var Block     = mongoose.model( 'Block' );
var Transaction     = mongoose.model( 'Transaction' );




var grabBlock3 = function() {
    var desiredBlockHashOrNumber = currentBlock;
    
    if(web3.isConnected()) {

        web3.eth.getBlock(desiredBlockHashOrNumber, true, function(error, blockData) {
            if(error) {
                console.log('Warning: error on getting block with hash/number: ' + desiredBlockHashOrNumber + ': ' + error);
                tryNextBlock();
            }
            else if(blockData == null) {
                console.log('Warning: null block data received from the block with hash/number: ' + desiredBlockHashOrNumber);
                tryNextBlock();
            }
            else {
                writeBlockToDB3(blockData);
                writeTransactionsToDB3(blockData, web3.eth);
            }
        });
    }
    else {
        console.log('Error: Aborted due to web3 is not connected when trying to ' +
            'get block ' + desiredBlockHashOrNumber);
        process.exit(9);
    }
}


var writeBlockToDB3 = function(blockData) {
    //only save address for transaction info
    blockData.txs = [];
    for(var i=0; i<blockData.transactions.length; i++){
        blockData.txs.push(blockData.transactions[i].hash);
    }
    
    Block.update(
        {number: blockData.number}, 
        {$set:{'txs':blockData.txs, 'witness':blockData.witness}}, 
        {multi: false, upsert: false}, 
        function (err, data) {
            if(err)
                console.log(err);
            else
                console.log("update block");
        }
      );
    
}

/**
    Break transactions out of blocks and write to DB
**/

var writeTransactionsToDB3 = function(blockData, eth) {
    if (blockData.transactions && blockData.transactions.length > 0) {
        var n = 0;
        for (d in blockData.transactions) {
            var txData = blockData.transactions[d];
            txData.witness = blockData.witness;

            Transaction.update(
                {'hash': txData.hash}, 
                {$set:{'witness':blockData.witness}}, 
                {multi: false, upsert: false}, 
                function (err, data) {
                  if(err){
                    console.log(err);
                  }else{
                    console.log("update tx");
                  }

                  n++;
                  if(n>=blockData.transactions.length){
                    tryNextBlock();
                  }
                }
              );
        }
    }else{
        //patch next block recursively
        tryNextBlock();
    }
}

/*
  Patch Missing Blocks
*/
var patchBlocks3 = function() {
    web3 = new Web3(new Web3.providers.HttpProvider(config3.httpProvider));
    var lastBlock = web3.eth.blockNumber;
    if(config3.patchEndBlocks == "latest"){
        currentBlock = lastBlock+1;
    }else{
        currentBlock = config3.patchEndBlocks+1;
    }


    tryNextBlock();
}

var sleepFlag = 0;
var tryNextBlock = function() {
    currentBlock--
    sleepFlag++;
    console.log("block number:", currentBlock);
    if(currentBlock>=config3.patchStartBlocks){
        if(sleepFlag>3){
            sleepFlag = 0;
            setTimeout(grabBlock3, 300);
        }else{
            grabBlock3();
        }
        
    }else{
        console.log("【finish path !】:", config3.patchEndBlocks);
        mongoose.disconnect();
    }

}


var currentBlock;

patchBlocks3();
