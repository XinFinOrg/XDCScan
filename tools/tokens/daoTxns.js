#!/usr/bin/env node

/*
    Thing to get history of DAO transactions
*/

var Web3 = require("xdc3");
var web3;
var async = require('async');

require( '../../db.js' );
require( '../../db-dao.js' );
require( '../../db-internal.js' );
var mongoose = require( 'mongoose' );
var Block = mongoose.model('Block');
var DAOCreatedToken = mongoose.model('DAOCreatedToken');
var DAOTransferToken = mongoose.model('DAOTransferToken');
var InternalTx     = mongoose.model( 'InternalTransaction' );

if (typeof web3 !== "undefined") {
  web3 = new Web3(web3.currentProvider);
} else {
  web3 = new Web3(new Web3.providers.HttpProvider("http://explorerrpc.apothem.network"));
}

if (web3.isConnected()) 
  console.log("Web3 connection established");
else
  throw "No connection";


var daoABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"from","type":"address"},{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"_totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"acceptOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"},{"name":"data","type":"bytes"}],"name":"approveAndCall","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"newOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"tokenAddress","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferAnyERC20Token","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"tokenOwner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Approval","type":"event"}];
var daoContract = web3.eth.contract(daoABI);
var DAO = daoContract.at("0xf5dbf200ef330f9e857f8abd462a4897f4ee663f");

var creationBlock = 310;
var creationEnd = 523;

var populateCreatedTokens = function () {
  //total: 58713

  var event = DAO.CreatedToken;
  event({}, {fromBlock: creationBlock, toBlock: creationEnd}).get( function(err, log) {
      if (err) {
        console.error(err);
        console.log("close:event");
        process.exit(9);
      } else {
        for (var l in log) {
          try {
            var newToken = {
                "transactionHash": log[l].transactionHash,
                "blockNumber": log[l].blockNumber,
                "amount": log[l].args.amount,
                "to": log[l].args.to
            }
          } catch (e) {
            console.error(e);
            continue;
          }

          new DAOCreatedToken(newToken).save( function( err, token, count ){
            if ( typeof err !== 'undefined' && err ) {
              if (err.code == 11000) {
                  console.log('Skip: Duplicate tx ' + 
                  log[l].transactionHash + ': ' + 
                  err);
              } else {
                 console.log('Error: Aborted due to error on ' + 
                      'block number ' + log[l].blockNumber.toString() + ': ' + 
                      err);
                 process.exit(9);
              }
            } else 
              console.log('DB successfully written for tx ' +
                        token.transactionHash );            
            
          });        
        }
      }

  });
}

var populateTransferTokens = function () {
  var event = DAO.Transfer;
  var transferEventFilter = event({}, {fromBlock: 0, toBlock: "latest"});
  var endBlockNum = 0;
  transferEventFilter.get( function(err, log) {
      if (err) {
        console.error(err);
        console.log("err");
        process.exit(9);
      } else {
        for (var l in log) {
          try {
            var newToken = {
                "transactionHash": log[l].transactionHash,
                "blockNumber": log[l].blockNumber,
                "amount": log[l].args.tokens,
                "to": log[l].args.to,
                "from": log[l].args.from
            }
          } catch (e) {
            console.error(e);
            continue;
          }
          endBlockNum = log[l].blockNumber;
          try {
            var block = web3.eth.getBlock(log[l].blockNumber);
            newToken.timestamp = block.timestamp;
          } catch (e) {
            console.error(e);
            continue;
          }
          new DAOTransferToken(newToken).save( function( err, token, count ){
            if ( typeof err !== 'undefined' && err ) {
              if (err.code == 11000) {
                  console.log('Skip: Duplicate tx ' + 
                  log[l].transactionHash + ': ' + 
                  err);
                  return null;
              } else {
                 console.log('Error: Aborted due to error on ' + 
                      'block number ' + log[l].blockNumber.toString() + ': ' + 
                      err);
                 process.exit(9);
              }
            } else 
              console.log('DB successfully written for tx ' +
                        log[l].transactionHash );            
            
          });        
        }

        //继续监听后续增加的事件
        var transferEventWatchFilter = event({}, {fromBlock: web3.eth.blockNumber, toBlock: "latest"});
        transferEventWatchFilter.watch(onTokenTransfer);
      }

  });

}

var onTokenTransfer= function(error, log){
  console.log("token transfer event:");
   var newToken = {
    "transactionHash": log.transactionHash,
    "blockNumber": log.blockNumber,
    "amount": log.args.tokens,
    "to": log.args.to,
    "from": log.args.from
  }
   new DAOTransferToken(newToken).save( function( err, token, count ){
     if(err){
      console.error(err);
     }else{
      console.log('DB successfully written for tx ' + log.transactionHash ); 
     }
   })
}

var bulkTimeUpdate = function(bulk, callback) {
  console.log("Bulk execution started");
  bulk.execute(function(err,result) {             
    if (err) 
      console.error(err);
    else 
      console.log(result.toJSON());
  });
}


var patchTimestamps = function(collection) {
  mongoose.connection.on("open", function(err,conn) { 

    var bulk = collection.initializeOrderedBulkOp();

    var bulkOps = [];
    var count = 0;
    var missingCount = 5200;
    collection.count({timestamp: null}, function(err, c) {
      missingCount = c;
      console.log("Missing: " + JSON.stringify(missingCount));
    });

    collection.find({timestamp: null}).forEach(function(doc) {
      setTimeout(function() {
        try {
          var block = web3.eth.getBlock(doc.blockNumber);
        } catch (e) {
          console.error(e); return;
        }

        bulk.find({ '_id': doc._id }).updateOne({
            '$set': { 'timestamp': block.timestamp }
        });
        count++;
        if(count % 100 === 0) {
          // Execute per 1000 operations and re-init
          bulkTimeUpdate(bulk);
          bulk = collection.initializeOrderedBulkOp();
        } 
        if(count == missingCount) {
          // Clean up queues
          bulkTimeUpdate(bulk);
        }
      }, 1000);
    });
        
  })
}

const BATCH = 1000;

var patchBlocks = function(max, min) {

  Block.find({"number": {$gt: min, $lt: max}}, "number timestamp").lean(true).exec(function(err, docs) {
    async.forEach(docs, function(doc, cb) {
      var q = { 'timestamp': null, 'blockNumber': doc.number };
      InternalTx.collection.update(q, { $set: { 'timestamp': doc.timestamp }}, 
                            {multi: true, upsert: false}, function(err, tx) {
                              if(err) console.error(err);
                              console.log(tx)
                              cb();
                            });
    }, function() { return; });
  });  
        
}

InternalTx.collection.count({timestamp: null}, function(err, c) {
  missingCount = c;
  console.log("Missing: " + JSON.stringify(missingCount));
});

var min;

var max = web3.eth.blockNumber;

setInterval(function() {
  InternalTx.findOne({"timestamp": null}, "blockNumber")
          .lean(true).sort('blockNumber')
          .exec(function(err, doc) {
            console.log(doc)
            if (doc)
              min = doc.blockNumber - 1;
            else
              min = max;

            var next = min + BATCH;
            if (next > max)
              {
                console.log("close:9");

                return;//tt
                // process.exit(9);
              }

            patchBlocks(next, min);
          });
}, 20000);


patchTimestamps(InternalTx.collection)
// populateCreatedTokens();
populateTransferTokens();
