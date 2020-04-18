//给console.log()增加时间戳
(function() { //add timestamp to console.log and console.error(from http://yoyo.play175.com)
    var date = new Date();
  
    function timeFlag() {
        date.setTime(Date.now());
        var m = date.getMonth() + 1;
        var d = date.getDate();
        var hour = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        var milliseconds = date.getMilliseconds();
        return '[' + ((m < 10) ? '0' + m : m) + '-' + ((d < 10) ? '0' + d : d) +
            ' ' + ((hour < 10) ? '0' + hour : hour) + ':' + ((minutes < 10) ? '0' + minutes : minutes) +
            ':' + ((seconds < 10) ? '0' + seconds : seconds) + '.' + ('00' + milliseconds).slice(-3) + '] ';
    }
    var log = console.log;
    console.error = console.log = function() {
        var prefix = ''; //cluster.isWorker ? '[WORKER '+cluster.worker.id + '] ' : '[MASTER]';
        if (typeof(arguments[0]) == 'string') {
            var first_parameter = arguments[0]; //for this:console.log("%s","str");
            var other_parameters = Array.prototype.slice.call(arguments, 1);
            log.apply(console, [prefix + timeFlag() + first_parameter].concat(other_parameters));
        } else {
            var args = Array.prototype.slice.call(arguments);
            log.apply(console, [prefix + timeFlag()].concat(args));
        }
    }
  })();
  
  /**
 * collect transactions, Token Contracts info from blockchain . write to db
 */
require( '../../db.js' );
var etherUnits = require("../../lib/etherUnits.js");
var BigNumber = require('bignumber.js');
var fs = require('fs');
var config3 = require('./../config.json')
var Web3 = require("xdc3-old");;
var web3;
var mongoose = require( 'mongoose' );
var Block     = mongoose.model( 'Block' );
var Transaction     = mongoose.model( 'Transaction' );
var Contract     = mongoose.model( 'Contract' );
var TokenTransfer = mongoose.model( 'TokenTransfer' );
var LogEvent = mongoose.model( 'LogEvent' );
const ERC20ABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"from","type":"address"},{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"_totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"acceptOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"},{"name":"data","type":"bytes"}],"name":"approveAndCall","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"newOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"tokenAddress","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferAnyERC20Token","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"tokenOwner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Approval","type":"event"}];
const ERC20_METHOD_DIC = {"0xa9059cbb":"transfer", "0xa978501e":"transferFrom"};
const METHOD_DIC = {
    "0x930a61a57a70a73c2a503615b87e2e54fe5b9cdeacda518270b852296ab1a377":"Transfer(address,address,uint)",
    "0xa9059cbb2ab09eb219583f4a59a5d0623ade346d962bcd4e46b11da047c9049b":"transfer(address,uint256)",
    "0xa978501e4506ecbd340f6e45a48ac5bd126b1c14f03f2210837c8e0b602d4d7b":"transferFrom(address,address,uint)",
    "0x086c40f692cc9c13988b9e49a7610f67375e8373bfe7653911770b351c2b1c54":"approve(address,uint)",
    "0xf2fde38b092330466c661fc723d5289b90272a3e580e3187d1d7ef788506c557":"transferOwnership(address)",
    "0x3bc50cfd0fe2c05fb67c0fe4be91fb10eb723ba30ea8f559d533fcd5fe29be7f":"Released(address,uint)",
    "0xb21fb52d5749b80f3182f8c6992236b5e5576681880914484d7f4c9b062e619e":"Released(address indexed, uint indexed)"
};





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
                if('terminateAtExistingDB' in config3 && config3.terminateAtExistingDB === true) {
                    checkBlockScanDBExistsThenWrite3(blockData);
                }
                else {
                    writeBlockToDB3(blockData);
                }
                if (!('skipTransactions' in config3 && config3.skipTransactions === true))
                    writeTransactionsToDB3(blockData, web3.eth);
                else{
                    tryNextBlock();
                }
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
    
    //write block to db
    return new Block(blockData).save( function( err, block, count ){
        if ( typeof err !== 'undefined' && err ) {
            if (err.code == 11000) {

                console.log('Skip: Duplicate key ');
            } else {
               console.log('Error: Aborted due to error on ' + 
                    'block number ' + blockData.number.toString() + ': ' + 
                    err);
               process.exit(9);
           }
        } else {
            //update witness reward
            Witness.update({"witness":blockData.witness},
            {$set:{"lastCountTo":blockData.number, "hash":blockData.hash, "miner":blockData.miner, "timestamp":blockData.timestamp, "status":true}, 
            $inc:{"blocksNum":1, "reward":0.3375}},
            {upsert: true},
            function (err, data) {
                if(err)
                    console.log("err:", err);
            }
            );

            if(!('quiet' in config3 && config3.quiet === true)) {
                console.log('DB written for block number:' + blockData.number.toString() );
            }           
        }
      });
}

/**
  * Checks if the a record exists for the block number then ->
  *     if record exists: abort
  *     if record DNE: write a file for the block
  */
var checkBlockScanDBExistsThenWrite3 = function(blockData) {
    Block.findOne({number: blockData.number}, function (err, b) {
        if(err){
            console.log(err);
            return;
        }
        if (!b)
            writeBlockToDB3(blockData);
        else {
            console.log('Aborting because block number: ' + blockData.number.toString() + ' already exists in DB.');
        }

    })
}

var upsertAddress=function(miner, addrs){
    if(miner){
        Address.update({"addr":miner},
            {$set:{"type":2}, $inc:{"balance":0.3375}},
            {upsert: true},
            function (err, doc) {
                if(err)
                    console.log("err:", err);
            }
        )
    }
    if(addrs){
        for(var i=0; i<addrs.length; i++){
            var balance = web3.eth.getBalance(addrs[i]);
            Address.update({"addr":addrs[i]},
                {$set:{"balance":balance}},
                {upsert: true},
                function (err, doc) {
                    if(err)
                        console.log("err:", err);
                }
            )
        }
    }
}

/**
    Break transactions out of blocks and write to DB
**/
var pingTXAddr = "0x000000000000000000000000000000000000000a";
var pingTXValue = "0";
var writeTransactionsToDB3 = function(blockData, eth) {
    var bulkOps = [];
    var addrs = [];
    if (blockData.transactions && blockData.transactions.length > 0) {
        for (d in blockData.transactions) {
            var txData = blockData.transactions[d];
            txData.timestamp = blockData.timestamp;
            txData.witness = blockData.witness;
            txData.gasPrice = etherUnits.toEther(new BigNumber(txData.gasPrice), 'ether');
            txData.value = etherUnits.toEther(new BigNumber(txData.value), 'wei');
            //receipt
            var receiptData = eth.getTransactionReceipt(txData.hash);
            if(receiptData){
                txData.gasUsed = receiptData.gasUsed;
                txData.contractAddress = receiptData.contractAddress;
                if(receiptData.status!=null)
                    txData.status = receiptData.status;
            }
            if(txData.input && txData.input.length>2){//internal transaction , contract create
                if(txData.to == null){//contract create
                    console.log("contract create at tx:"+txData.hash);
                    var contractdb = {}
                    var isTokenContract = true;
                    var Token = ContractStruct.at(receiptData.contractAddress);
                    if(Token){//write Token to Contract in db
                        try{
                            contractdb.byteCode = eth.getCode(receiptData.contractAddress);
                            contractdb.blockNumber = blockData.number;
                            contractdb.tokenName = Token.name();
                            contractdb.decimals = Token.decimals();
                            contractdb.symbol = Token.symbol();
                            contractdb.totalSupply = Token.totalSupply();
                        }catch(err){
                            isTokenContract = false;
                        }
                    }else{//not Token Contract, need verify contract for detail
                        // console.log("not Token Contract");
                        isTokenContract = false;
                    }
                    contractdb.owner = txData.from;
                    contractdb.creationTransaction = txData.hash;
                    if(isTokenContract){
                        contractdb.ERC = 2;
                    }else{// normal contract
                        // console.log("normal contract");
                        contractdb.ERC = 0;
                    }
                    //write to db
                    Contract.update(
                        {address: receiptData.contractAddress}, 
                        {$setOnInsert: contractdb}, 
                        {upsert: true}, 
                        function (err, data) {
                            if(err)
                                console.log(err);
                        }
                    );
                }else{//internal transaction  . write to doc of InternalTx
                    var transferData = {"transactionHash": "", "blockNumber": 0, "amount": 0, "contractAdd":"", "to": "", "from": "", "timestamp":0};
                    var methodCode = txData.input.substr(0,10);
                    if(ERC20_METHOD_DIC[methodCode]=="transfer" || ERC20_METHOD_DIC[methodCode]=="transferFrom"){
                        
                        if(ERC20_METHOD_DIC[methodCode]=="transfer"){//token transfer transaction
                            transferData.from= txData.from;
                            transferData.to= "0x"+txData.input.substring(34,74);
                            transferData.amount= Number("0x"+txData.input.substring(74));
                        }else{//transferFrom
                            transferData.from= "0x"+txData.input.substring(34,74);
                            transferData.to= "0x"+txData.input.substring(74,114);
                            transferData.amount= Number("0x"+txData.input.substring(114));
                        }
                        transferData.methodName = ERC20_METHOD_DIC[methodCode];
                        transferData.transactionHash= txData.hash;
                        transferData.blockNumber= blockData.number;
                        transferData.contractAdd= txData.to;
                        
                        transferData.timestamp = blockData.timestamp;
                        //write transfer transaction into db
                        TokenTransfer.update(
                            {transactionHash: transferData.transactionHash}, 
                            {$setOnInsert: transferData}, 
                            {upsert: true}, 
                            function (err, data) {
                                if(err)
                                    console.log(err);
                            }
                        );
                    }
                }

            }else{//out transaction
                // console.log("not contract transaction");
            }

            //Event logs of internal transaction  . write to doc of EventLog
            if(receiptData){
                logEvents = [];
                for(k in receiptData.logs){
                    var logItem = receiptData.logs[k];
                    var logEvent = {"address":"", "txHash": "", "blockNumber": 0, "contractAdd":"", "from":"", "to":"", "timestamp":0, "methodName": "", "eventName":"", "logIndex":0, "topics":null, "data": ""};
                    logEvent.address = logItem.address;
                    logEvent.logIndex = logItem.logIndex;
                    logEvent.topics = logItem.topics;
                    logEvent.data = logItem.data;
                    var methodCode = txData.input.substr(0,10);
                    if(ERC20_METHOD_DIC[methodCode])
                        logEvent.methodName = ERC20_METHOD_DIC[methodCode];
                    var eventCode = logItem.topics[0].substr(0,66);
                    if(METHOD_DIC[eventCode])
                        logEvent.eventName = METHOD_DIC[eventCode];
                    logEvent.txHash= txData.hash;
                    logEvent.blockNumber= blockData.number;
                    logEvent.contractAdd= txData.to;
                    logEvent.from= receiptData.from;
                    logEvent.to= receiptData.to;
                    logEvent.timestamp = blockData.timestamp;
                    logEvents.push(logEvent);

                    //deal with Released
                    if(logEvent.eventName.indexOf("Released(")==0){
                        txData.from = txData.to;
                        txData.to = "0x"+logEvent.topics[1].substr(26);
                        txData.value = etherUnits.toEther(new BigNumber(logEvent.topics[2]), 'wei');
                    }
                }
                //write all type of internal transaction into db
                if(logEvents.length>0){
                    LogEvent.collection.insert(logEvents, function( err, logE ){
                        if ( typeof err !== 'undefined' && err ) {
                            if (err.code == 11000) {
                                //console.log('Skip: Duplicate key ' + err);
                            } else {
                            console.log('LogEvent Error: Aborted due to error: ' + err);
                        }
                        } else{
                            //console.log('DB successfully written for block ' + blockData.transactions.length.toString() );
                        }
                    });
                } 
            }

            //drop out masterNode ping transactions
            if(!(txData.to == pingTXAddr && txData.value == pingTXValue && 
                (txData.gasUsed==34957||txData.gasUsed==49957||txData.gasUsed==34755||txData.gasUsed==19755||txData.gasUsed==44550))
                ){
                bulkOps.push(txData);
                if(txData.from)
                    addrs.push(txData.from);
                if(txData.to)
                    addrs.push(txData.to);
            }
        }

        //collect address
        upsertAddress(blockData.miner, addrs);
        //insert doc
        if(bulkOps.length>0){
            Transaction.collection.insert(bulkOps, function( err, tx ){
                if ( typeof err !== 'undefined' && err ) {
                    if (err.code == 11000) {
                        // console.log('Skip: Duplicate key ' + err);
                        console.log('Skip: Duplicate key ');
                    } else {
                    console.log('Error: Aborted due to error: ' + err);
                    //process.exit(9);
                }
                } else if(!('quiet' in config3 && config3.quiet === true)) {
                    console.log('DB written tx num: ' + blockData.transactions.length.toString() );
                }

                //patch next block recursively
                tryNextBlock();
            });
        }else{
            tryNextBlock();
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
    console.log("topBlock:",lastBlock);
    ContractStruct = web3.eth.contract(ERC20ABI);

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
            setTimeout(grabBlock3, 100);
        }else{
            grabBlock3();
        }
        
    }else{
        console.log("【finish path !】:", config3.patchEndBlocks);
        mongoose.disconnect();
    }

}





var ContractStruct;
var currentBlock;

patchBlocks3();
