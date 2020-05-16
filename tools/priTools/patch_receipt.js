require( '../../db.js' );
var etherUnits = require("../../lib/etherUnits.js");
var BigNumber = require('bignumber.js');

var fs = require('fs');
var config = require('./../config.json')
var Web3 = require("xdc3-old");;
var web3;
var TokenTransferGrabber = require('../grabTokenTransfer');
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

var ContractStruct;

//the TX has no receipt while grabbing block, we cache TX and grab later
var laterGrabBlockDatas = [];

//listen every history token in db
var listenHistoryToken = function(){
    // var eth = require('./web3relay').eth;
    // var TokenTransferGrabber = require('./grabTokenTransfer');
    // TokenTransferGrabber.Init(eth);
    var ContractFind = Contract.find({ERC:{$gt:0}}).lean(true);
    var transforEvent;
    ContractFind.exec(function(err, doc){
      if(doc){
        for(var i=0; i<doc.length; i++){
          //transforEvent = TokenTransferGrabber.GetTransferEvent(doc[i].abi, doc[i].address)
          transforEvent = TokenTransferGrabber.GetTransferEvent(ERC20ABI, doc[i].address)
          TokenTransferGrabber.ListenTransferTokens(transforEvent, web3.eth.blockNumber+1);
        }
      }
    })
}

var grabBlocks = function(config) {
    // listenHistoryToken();
    if('listenOnly' in config && config.listenOnly === true) {
        listenBlocks(config, web3);
    }
    else
        setTimeout(function() {
            grabBlock(config, web3, config.blocks.pop());
        }, 2000);

}

var listenBlocks = function(config, web3) {
    var newBlocks = web3.eth.filter("latest");
    newBlocks.watch(function (error, log) {
        //console.log("watch log:", log);
        if(error) {
            console.log('Error: ' + error);
        } else if (log == null) {
            //console.log('Warning: null block hash');
        } else {
            grabBlock(config, web3, log);
        }

    });
}

var grabBlock = function(config, web3, blockHashOrNumber) {
    var desiredBlockHashOrNumber;

    // check if done
    if(blockHashOrNumber == undefined) {
        return; 
    }

    if (typeof blockHashOrNumber === 'object') {
        if('start' in blockHashOrNumber && 'end' in blockHashOrNumber) {
            desiredBlockHashOrNumber = blockHashOrNumber.end;
        }
        else {
            console.log('Error: Aborted becasue found a interval in blocks ' +
                'array that doesn\'t have both a start and end.');
            process.exit(9);
        }
    }
    else {
        desiredBlockHashOrNumber = blockHashOrNumber;
    }

    if(web3.isConnected()) {

        web3.eth.getBlock(desiredBlockHashOrNumber, true, function(error, blockData) {
            if(error) {
                //console.log('Warning: error on getting block with hash/number: ' + desiredBlockHashOrNumber + ': ' + error);
            }
            else if(blockData == null) {
                //console.log('Warning: null block data received from the block with hash/number: ' + desiredBlockHashOrNumber);
            }
            else {
                if('terminateAtExistingDB' in config && config.terminateAtExistingDB === true) {
                    checkBlockScanDBExistsThenWrite(config, blockData);
                }
                else {
                    writeBlockToDB(config, blockData);
                }

                if (!('skipTransactions' in config && config.skipTransactions === true))
                    writeTransactionsToDB(blockData);
                
                if('listenOnly' in config && config.listenOnly === true) 
                    return;

                if('hash' in blockData && 'number' in blockData) {
                    // If currently working on an interval (typeof blockHashOrNumber === 'object') and 
                    // the block number or block hash just grabbed isn't equal to the start yet: 
                    // then grab the parent block number (<this block's number> - 1). Otherwise done 
                    // with this interval object (or not currently working on an interval) 
                    // -> so move onto the next thing in the blocks array.
                    if(typeof blockHashOrNumber === 'object' &&
                        (
                            (typeof blockHashOrNumber['start'] === 'string' && blockData['hash'] !== blockHashOrNumber['start']) ||
                            (typeof blockHashOrNumber['start'] === 'number' && blockData['number'] > blockHashOrNumber['start'])
                        )
                    ) {
                        blockHashOrNumber['end'] = blockData['number'] - 1;
                        grabBlock(config, web3, blockHashOrNumber);
                    }
                    else {
                        grabBlock(config, web3, config.blocks.pop());
                    }
                }
                else {
                    console.log('Error: No hash or number was found for block: ' + blockHashOrNumber);
                    process.exit(9);
                }
            }
        });
    }else {
        console.log('Error: Aborted due to web3 is not connected when trying to ' +
            'get block ' + desiredBlockHashOrNumber);
        process.exit(9);
    }
}


var writeBlockToDB = function(config, blockData) {
    //only save address for transaction info
    blockData.txs = [];
    for(var i=0; i<blockData.transactions.length; i++){
        blockData.txs.push(blockData.transactions[i].hash);
    }
    //update witness
    Witness.update({"witness":blockData.witness},
    {$set:{"lastCountTo":blockData.number, "hash":blockData.hash, "miner":blockData.miner, "timestamp":blockData.timestamp, "status":true}, 
    $inc:{"blocksNum":1, "reward":0.3375}},
    {upsert: true},
    function (err, data) {
        if(err)
            console.log("err:", err);
    }
    );
    //write block to db
    return new Block(blockData).save( function( err, block, count ){
        if ( typeof err !== 'undefined' && err ) {
            if (err.code == 11000) {
                //console.log('Skip: Duplicate key ' + blockData.number.toString() + ': ' + err);
            } else {
               console.log('Error: Aborted due to error on ' + 
                    'block number ' + blockData.number.toString() + ': ' + 
                    err);
               process.exit(9);
           }
        } else {
            if(!('quiet' in config && config.quiet === true)) {
                //console.log('DB successfully written for block number ' + blockData.number.toString() );
            }            
        }
      });
}

/**
  * Checks if the a record exists for the block number then ->
  *     if record exists: abort
  *     if record DNE: write a file for the block
  */
var checkBlockScanDBExistsThenWrite = function(config, blockData) {
    Block.find({number: blockData.number}, function (err, b) {
        if (!b.length)
            writeBlockToDB(config, blockData);
        else {
            //console.log('Aborting because block number: ' + blockData.number.toString() + ' already exists in DB.');
            process.exit(9);
        }

    })
}

/**
    Break transactions out of blocks and write to DB
**/
var writeTransactionsToDB = function(blockData) {
    var bulkOps = [];
    var noReceiptTXs = [];
    var checkTxs = checkTXDic[String(blockData.number)];
    if (blockData.transactions.length > 0) {
        for (d in blockData.transactions) {
            var txData = blockData.transactions[d];
            if(checkTxs.indexOf(txData.hash)==-1)
                continue;
            //receipt . maybe null at this moment
            var receiptData = web3.eth.getTransactionReceipt(txData.hash);
            if(!receiptData){
                noReceiptTXs.push(txData);
                continue;
            }
            txData.timestamp = blockData.timestamp;
            txData.witness = blockData.witness;
            txData.gasPrice = etherUnits.toEther(new BigNumber(txData.gasPrice), 'ether');
            txData.value = etherUnits.toEther(new BigNumber(txData.value), 'wei');
            
            if(receiptData){
                //write all type of transaction into db
                Transaction.update(
                    {hash: txData.hash}, 
                    {$set:{'gasUsed':receiptData.gasUsed, 'contractAddress':receiptData.contractAddress, 'status':receiptData.status}}, 
                    {multi: false, upsert: false}, 
                    function (err, data) {
                        if(err)
                            console.log(err);
                    }
                  );
            }
            if(txData.input && txData.input.length>2){// contract create, Event logs of internal transaction
                if(txData.to == null){//contract create
                    //console.log("contract create at tx:"+txData.hash);
                    var contractdb = {}
                    var isTokenContract = true;
                    var Token = ContractStruct.at(receiptData.contractAddress);
                    if(Token){//write Token to Contract in db
                        try{
                            contractdb.byteCode = web3.eth.getCode(receiptData.contractAddress);
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

        }
        
    }

    //cache and grab later
    if(noReceiptTXs.length>0){
        blockData.transactions = noReceiptTXs;
        laterGrabBlockDatas.push(blockData);
    }
}

/*
  Patch Missing Blocks
*/
var patchBlocks = function(config) {
    var web3 = new Web3(new Web3.providers.HttpProvider(config.rpc));

    // number of blocks should equal difference in block numbers
    var firstBlock = 0;
    var lastBlock = web3.eth.blockNumber;
    blockIter(web3, firstBlock, lastBlock, config);
}

var blockIter = function(web3, firstBlock, lastBlock, config) {
    // if consecutive, deal with it
    if (lastBlock < firstBlock)
        return;
    if (lastBlock - firstBlock === 1) {
        [lastBlock, firstBlock].forEach(function(blockNumber) {
            Block.find({number: blockNumber}, function (err, b) {
                if (!b.length)
                    grabBlock(config, web3, firstBlock);
            });
        });
    } else if (lastBlock === firstBlock) {
        Block.find({number: firstBlock}, function (err, b) {
            if (!b.length)
                grabBlock(config, web3, firstBlock);
        });
    } else {

        Block.count({number: {$gte: firstBlock, $lte: lastBlock}}, function(err, c) {
          var expectedBlocks = lastBlock - firstBlock + 1;
          if (c === 0) {
            grabBlock(config, web3, {'start': firstBlock, 'end': lastBlock});
          } else if (expectedBlocks > c) {
            //console.log("Missing: " + JSON.stringify(expectedBlocks - c));  
            var midBlock = firstBlock + parseInt((lastBlock - firstBlock)/2); 
            blockIter(web3, firstBlock, midBlock, config);
            blockIter(web3, midBlock + 1, lastBlock, config);
          } else 
            return;
        })
    }
}

//periodically grab TX which has no TXReceipt while block grabbing
var patchIntervalHandle =-1;
var patchNoReceiptInterval = function(){
    patchIntervalHandle = setInterval(function(){
        if(laterGrabBlockDatas.length>0){
            var _blockData = laterGrabBlockDatas.shift();
            if(!_blockData.hasOwnProperty("grabTime")){
                _blockData.grabTime=0;
            }else{
                _blockData.grabTime++;
            }
            if(_blockData.grabTime>10){//3 tries at most
                for(var i=0; i<_blockData.transactions.length; i++){
                    console.log("no transactionReceipt: "+_blockData.transactions[i].hash);
                }
                return;
            }
            
            writeTransactionsToDB(_blockData);
        }else{
            clearInterval(patchIntervalHandle);
        }
    }, 200);
}

var checkTXDic = {};
function patchNoReciept(){
    blockNumberKey = -1;
    Transaction.find({'gasUsed':null}).exec(async function(err, docs){
        for(var i=0; i<docs.length; i++){
            if(blockNumberKey != docs[i].blockNumber){//group by blockNumber
                blockNumberKey = docs[i].blockNumber;
                checkTXDic[String(blockNumberKey)] = [];
                var bd = web3.eth.getBlock(blockNumberKey, true);
                laterGrabBlockDatas.push(bd);
                
            }
            checkTXDic[String(blockNumberKey)].push(docs[i].hash);
        }
        console.log("totalcount:"+docs.length);

        patchNoReceiptInterval();
    });

}

web3 = new Web3(new Web3.providers.HttpProvider(config.rpc));
TokenTransferGrabber.Init(web3.eth);
ContractStruct = web3.eth.contract(ERC20ABI);

//grabBlocks(config);

patchNoReciept();
