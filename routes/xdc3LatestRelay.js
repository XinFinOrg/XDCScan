#!/usr/bin/env node

/*
    Endpoint for client to talk to etc node
*/

var Web3 = require("xdc3");
var web3;
var config = require('./../config.json')
var BigNumber = require('bignumber.js');
var etherUnits = require(__lib + "etherUnits.js")

var getLatestBlocks = require('./index').getLatestBlocks;
var filterBlocks = require('./filters').filterBlocks;
var filterTrace = require('./filters').filterTrace;


if (typeof web3 !== "undefined") {
  web3 = new Web3(web3.currentProvider);
} else {
  web3 = new Web3(new Web3.providers.HttpProvider(config.rpc));
}


// if (web3.isConnected()) 
//   console.log("Web3 connection established");
// else
//   throw "No connection";


// var newBlocks = web3.eth.filter("latest");
// var newTxs = web3.eth.filter("pending");
exports.getTX = function(txHash){
  if(!txHash)
    return null;
  if(txHash.indexOf('0x')!=0){
    txHash = "0x"+txHash;
  }
  var txData;
  try{
    txData = web3.eth.getTransaction(txHash);
  }catch(err){
    console.log("getTX err: ", err);
    txData = {};
  }
  return txData;
}

exports.getBlock = function(blockNumber){
  if(isNaN(blockNumber) || !blockNumber){
    return null;
  }
  var blockData;
  try{
    blockData = web3.eth.getBlock(blockNumber);
  }catch(err){
    console.log("getBlock err:", err);
  }
  return blockData;
}

exports.data = function(req, res){
  //console.log("web3relay data :"+req.client.remoteAddress+":"+req.client.remotePort);
  
  if ("tx" in req.body) {
    var txHash = req.body.tx.toLowerCase();
    if(txHash.indexOf('0x')!=0)
      txHash = '0x'+txHash;

    web3.eth.getTransaction(txHash, function(err, tx) {
      if(err || !tx) {
        console.error("TxWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
        res.end();
      } else {
        var ttx = tx;
        ttx.value = tx.value;
        ttx.value = etherUnits.toEther( new BigNumber(tx.value), "wei");
        //get timestamp from block
        var block = web3.eth.getBlock(tx.blockNumber, function(err, block) {
          if (!err && block)
            ttx.timestamp = block.timestamp;
          ttx.isTrace = (ttx.input != "0x");
          res.write(JSON.stringify(ttx));
          res.end();
        });
      }
    });

  } else if ("tx_trace" in req.body) {
    var txHash = req.body.tx_trace.toLowerCase();
    web3.trace.transaction(txHash, function(err, tx) {
      if(err || !tx) {
        console.error("TraceWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        res.write(JSON.stringify(filterTrace(tx)));
      }
      res.end();
    });
  } else if ("addr_trace" in req.body) {//internalTX
    var addr = req.body.addr_trace.toLowerCase();
    // need to filter both to and from
    // from block to end block, paging "toAddress":[addr], 
    // start from creation block to speed things up 
    // TODO: store creation block
    var filter = {"fromBlock":"0x1d4c00", "toAddress":[addr]};
    web3.trace.filter(filter, function(err, tx) {
      if(err || !tx) {
        console.error("TraceWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        res.write(JSON.stringify(filterTrace(tx)));
      }
      res.end();
    })
  } else if ("addr" in req.body) {
    var addr = req.body.addr.toLowerCase();
    var options = req.body.options;

    var addrData = {};
    if (options.indexOf("bytecode") > -1) {
      try {
         addrData["bytecode"] = web3.eth.getCode(addr);
         if (addrData["bytecode"].length > 2){
          addrData["isContract"] = true;
          // //redirect to /tokenAddr
          // res.redirect("https://www.baidu.com");
          // // res.writeHead(302, {
          // //   'Location': '/token/'+addr
          // //   //add other headers here...
          // // });
          // res.end();
          // return;
         }
         else
            addrData["isContract"] = false;
      } catch (err) {
        console.error("AddrWeb3 error :" + err);
        addrData = {"error": true};
      }
    }
    if (options.indexOf("balance") > -1) {
      try {
        addrData["balance"] = web3.eth.getBalance(addr);  
        addrData["balance"] = etherUnits.toEther(addrData["balance"], 'wei');
      } catch(err) {
        console.error("AddrWeb3 error :" + err);
        addrData = {"error": true};
      }
    }
    if (options.indexOf("count") > -1) {
      // 'count' calculating is turned to db 
      // try {
      //    addrData["count"] = web3.eth.getTransactionCount(addr);
      //    console.log("count:"+addrData["count"]);
      // } catch (err) {
      //   console.error("AddrWeb3 error :" + err);
      //   addrData = {"error": true};
      // }
      addrData["count"] = 1;
    }
    
   
    res.write(JSON.stringify(addrData));
    res.end();


  } else if ("block" in req.body) {
    var blockNum = req.body.block;
    web3.eth.getBlock(blockNum, function(err, block) {
      if(err) {
        console.error("BlockWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      }else if(!block){
        res.write(JSON.stringify({}));
      }else {
        block = filterBlocks(block);
        res.write(JSON.stringify(block));
      }
      res.end();
    });

  } else {
    console.error("Invalid Request: " + req.body)
    res.status(400).send();
    res.end();
  }

};

exports.web3 = web3;
exports.eth = web3.eth;

  