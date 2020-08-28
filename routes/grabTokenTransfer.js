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
exports.PatchTransferTokens = async function(ERC20ABI,contractData, listenOnComplete){
  var TokenInstance = new eth.Contract(ERC20ABI,contractData.address);
  // var event = exports.GetTransferEvent(ERC20ABI, contractData.address);
  // var transferEventFilter = event({}, {fromBlock: 0, toBlock: "latest"});

  let transferEventLog = await TokenInstance.getPastEvents('allEvents', { fromBlock: 0, toBlock: 'latest' });
  var endBlockNum = 0;
        var tokenTransferObj = { "transactionHash": "", "methodName": "",  "blockNumber": 0, "amount": 0, "contractAdd":"", "to": "", "from": "", "timestamp":0};
                
        // console.log(transferEventLog)
        for (var l in transferEventLog) {
          try {
            tokenTransferObj.transactionHash= transferEventLog[l].transactionHash;
            tokenTransferObj.methodName= transferEventLog[l].event;
            tokenTransferObj.blockNumber= transferEventLog[l].blockNumber;
            tokenTransferObj.amount= transferEventLog[l].returnValues.value;
            tokenTransferObj.contractAdd= transferEventLog[l].address.toLowerCase();
            tokenTransferObj.to= transferEventLog[l].returnValues.to;
            tokenTransferObj.from= transferEventLog[l].returnValues.from;
            
          } catch (e) {
            console.error(e);
            continue;
          }
          if(tokenTransferObj.methodName =='Burn')
          {
            tokenTransferObj.from= transferEventLog[l].returnValues.burner;
            tokenTransferObj.to= tokenTransferObj.methodName;
            tokenTransferObj.amount= transferEventLog[l].returnValues.amount;

          }

          if(tokenTransferObj.methodName =='MinterConfigured')
          {
            tokenTransferObj.to= tokenTransferObj.methodName;
            tokenTransferObj.from= transferEventLog[l].returnValues.minter;
            tokenTransferObj.amount= transferEventLog[l].returnValues.minterAllowedAmount;

          }
          if(tokenTransferObj.methodName =='Mint')
          {
            tokenTransferObj.from= transferEventLog[l].returnValues.minter;
            tokenTransferObj.amount= transferEventLog[l].returnValues.amount;

          }
          
          endBlockNum = transferEventLog[l].blockNumber;
          try {
            var block = await eth.getBlock(transferEventLog[l].blockNumber);
            tokenTransferObj.timestamp = block.timestamp;
          } catch (e) {
            console.error(e);
            continue;
          }

          //write to db
          new db.TokenTransfer(tokenTransferObj).save( function( err, token, count ){
            if ( typeof err !== 'undefined' && err ) {
              if (err.code == 11000) {
                  console.log('Skip: Duplicate tx ' + transferEventLog[l].transactionHash + ': ' + err);
                  return null;
              } else {
                 console.log('Error: Aborted due to error on ' + 'block number ' + transferEventLog[l].blockNumber.toString() + ': ' + err);
                 return null;
              }
            } else 
              console.log('DB successfully written for tx ' + transferEventLog[l].transactionHash );            
          });        
        }
        //finish history TokenTransfer
        let blocknumber = await eth.getBlockNumber()
        if(listenOnComplete){
          exports.ListenTransferTokens(TokenInstance, blocknumber+1);
        }
 

  return TokenInstance;
}


//listen new TransferTokens event
exports.ListenTransferTokens=  function(transferEvent, fromBlockNum=blocknumber){
  var transferEventWatchFilter = transferEvent.getPastEvents('Transfer', { fromBlock: fromBlockNum, toBlock: 'latest' });
  // var transferEventWatchFilter = transferEvent({}, {fromBlock: fromBlockNum, toBlock: "latest"});
    // transferEventWatchFilter.watch(onTokenTransfer);  Need to work from here. Anil
}

exports.GetTransferEvent=function(abiObj, contractAddress){
  var TokenInstance = new eth.Contract(abiObj,contractAddress);
  // var TokenInstance = tokenContract.at(contractAddress);
  console.log(TokenInstance.Transfer,"TokenInstance.Transfer")
  return TokenInstance.Transfer;
}

var onTokenTransfer= function(error, log){
  console.log("token transfer event:");
  if(log){
    var tokenTransferObj = {"transactionHash": "", "blockNumber": 0, "amount": 0, "contractAdd":"", "to": "", "from": "", "timestamp":0};
    tokenTransferObj.transactionHash= log.transactionHash;
    tokenTransferObj.blockNumber= log.blockNumber;
    tokenTransferObj.amount= log.args.tokens;
    tokenTransferObj.contractAdd= log.address;
    tokenTransferObj.to= log.args.to;
    tokenTransferObj.from= log.args.from;
    var block = eth.getBlock(log.blockNumber);
    tokenTransferObj.timestamp = block.timestamp;//tt
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

