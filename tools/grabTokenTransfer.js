/*
deal with TokenTransfer
get TokenTransfer information from blockchain and write to db to rise read speed
listen new TokenTransfer and write to db
*/
var db = require( '../db.js' );
var eth;
var config = require('./../config.json')


exports.Init = function(ethInstance){
  if(eth)
    return;
  eth = ethInstance;
}


//get TokenTransfer information from blockchain
exports.PatchTransferTokens = function(contractAddr, contractABI, blockNum=0, listenOnComplete=true){
  var eventFilter = exports.GetTransferEvent(contractABI, contractAddr);
  var transferEventFilter = eventFilter({}, {fromBlock: blockNum, toBlock: "latest"});
  var endBlockNum = 0;
  transferEventFilter.get( function(err, log) {
      if (err) {
        console.error(err);
        return null;
      } else {
        var tokenTransferObj = {"transactionHash": "", "blockNumber": 0, "amount": 0, "contractAdd":"", "to": "", "from": "", "timestamp":0};
        for (var l in log) {
          try {
            tokenTransferObj.transactionHash= log[l].transactionHash;
            tokenTransferObj.blockNumber= log[l].blockNumber;
            tokenTransferObj.amount= log[l].args.tokens;
            tokenTransferObj.contractAdd= log[l].address;
            tokenTransferObj.to= log[l].args.to;
            tokenTransferObj.from= log[l].args.from;
          } catch (e) {
            console.error(e);
            continue;
          }
          endBlockNum = log[l].blockNumber;
          try {
            var block = eth.getBlock(log[l].blockNumber);
            tokenTransferObj.timestamp = block.timestamp;
          } catch (e) {
            console.error(e);
            continue;
          }

          //write to db
          new db.TokenTransfer(tokenTransferObj).save( function( err, token, count ){
            if ( typeof err !== 'undefined' && err ) {
              if (err.code == 11000) {
                  console.log('Skip: Duplicate tx ' + log[l].transactionHash + ': ' + err);
                  return null;
              } else {
                 console.log('Error: Aborted due to error on ' + 'block number ' + log[l].blockNumber.toString() + ': ' + err);
                 return null;
              }
            } else 
              console.log('DB successfully written for tx ' + log[l].transactionHash );            
          });        
        }
        //finish history TokenTransfer

        if(listenOnComplete){
          exports.ListenTransferTokens(eventFilter, eth.blockNumber+1);
        }
      }
  });

  return eventFilter;
}


//listen new TransferTokens event
exports.ListenTransferTokens=  function(transferEvent, fromBlockNum=eth.blockNumber){
  var transferEventWatchFilter = transferEvent({}, {fromBlock: fromBlockNum, toBlock: "latest"});
    transferEventWatchFilter.watch(onTokenTransfer);
}

exports.GetTransferEvent=function(abiObj, contractAddress){
  if(typeof(abiObj) == "string"){
    abiObj = JSON.parse(abiObj);
  }
  var tokenContract = eth.contract(abiObj);
  var TokenInstance = tokenContract.at(contractAddress);
  return TokenInstance.Transfer;
}

var onTokenTransfer= function(error, log){
  //console.log("token transfer event:");
  if(log){
    var tokenTransferObj = {"transactionHash": "", "blockNumber": 0, "amount": 0, "contractAdd":"", "to": "", "from": "", "timestamp":0};
    tokenTransferObj.transactionHash= log.transactionHash;
    tokenTransferObj.blockNumber= log.blockNumber;
    tokenTransferObj.amount= log.args.tokens;
    tokenTransferObj.contractAdd= log.address;
    tokenTransferObj.to= log.args.to;
    tokenTransferObj.from= log.args.from;
    var block = eth.getBlock(log.blockNumber);
    tokenTransferObj.timestamp = block.timestamp;
    new db.TokenTransfer(tokenTransferObj).save( function( err, token, count ){
      if(err){
        console.error(err);
      }else{
        console.log('DB successfully written for tx ' + log.transactionHash ); 
      }
    })
  }
  
}

// test
// var Web3 = require("xdc3-old");;
// var web3 = new Web3(new Web3.providers.HttpProvider(config.rpc));
// exports.Init(web3.eth);
// var contractData = {};
// contractData.abi = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"from","type":"address"},{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"_totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"acceptOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"},{"name":"data","type":"bytes"}],"name":"approveAndCall","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"newOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"tokenAddress","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferAnyERC20Token","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"tokenOwner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Approval","type":"event"}];
// contractData.address = "0xf872d73b0da8bb2fc58af1d0df66d81da7ee9e5e";//"0xf5dbf200ef330f9e857f8abd462a4897f4ee663f";
// exports.PatchTransferTokens(contractData, true);

