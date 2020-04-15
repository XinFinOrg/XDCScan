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

var Web3 = require("xdc3-old");;
var web3;
var mongoose = require( 'mongoose' );
var Address = mongoose.model('Address');
var addressItems = [];
var dupAddrs = [];
var config3 = require('./../config.json')


// init bloom filter
var bloomFilter = require('./node_bloom_filter/bloomfilter');
// let bFilter = new bloomFilter({
//     nHash:16,
//     nBits:1024*64
// });
let bFilter = new bloomFilter({
    optimize: true,/*This automatically calculates number of hashes and bits to be used internally*/
    falsePositiveRate: 0.00000015,/*Desired false positive rate,less rate will use more memory internally*/
    isCounting: false,// False by default,
    nElements:15000000
});


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
                writeTransactionsToDB3(blockData);
            }
        });
    }
    else {
        console.log('Error: Aborted due to web3 is not connected when trying to ' + 'get block ' + desiredBlockHashOrNumber);
        process.exit(9);
    }
}


/**
    Break transactions out of blocks and write to DB
**/
var writeTransactionsToDB3 = function(blockData) {
    collectAddr(blockData.miner);
    if (blockData.transactions && blockData.transactions.length > 0) {
        for (d in blockData.transactions) {
            var txData = blockData.transactions[d];
            collectAddr(txData.from);
            collectAddr(txData.to);
        }
    }
    tryNextBlock();
}

function collectAddr(addr){
    if(!addr){
        return;
    }
    if(bFilter.has(addr)){
        //console.log("exist:",addr);
        // if(addressItems.indexOf(addr)==-1){//纠正布隆过滤器的误判
        //     addressItems.push(addr);
        // }
        return;
    }else{
        bFilter.add(addr);
    }
        
    // for(var i=0; i<addressItems.length; i++){
    //     if(addressItems[i] == addr){
    //         return;
    //     }
    // }

    addressItems.push(addr);
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

    tryNextBlock();
}

var sleepFlag = 0;
var tryNextBlock = function() {
    currentBlock--
    sleepFlag++;
    if(currentBlock%1000==0)
        console.log("block number:", currentBlock);
    if(currentBlock>=config3.patchStartBlocks){
        if(sleepFlag>3){
            sleepFlag = 0;
            // setTimeout(grabBlock3, 100);
            grabBlock3();
        }else{
            grabBlock3();
        }
        
    }else{
        console.log("【finish address grabber. ready insert db】:");
        nextInsertBatch();
    }

}

var itemBatchSize = 100;
var batchIdex = -1;
var batchItems = [];
var itemIndex = -1;
function nextInsertBatch(){
    batchItems.length = 0;
    batchIdex++;
    console.log("nextInsertBatch index:", batchIdex);
    for(var i=0; i<itemBatchSize; i++){
        itemIndex++;
        if(itemIndex>=addressItems.length){
            break;
        }
        var addrItem = {"addr":addressItems[itemIndex], "type":0, "balance":0};
        addrItem.balance = web3.eth.getBalance(addrItem.addr);
        // if(contractAddrs.indexOf(addrItem.addr)>-1){//contract addr
        //     addrItem.type = 1;
        // }
        if(addrItem.balance>0)
            batchItems.push(addrItem);
    }
    if(batchItems.length>0){
        insertDB();
    }else if(itemIndex<addressItems.length){
        nextInsertBatch();
    }else{
        console.log("total items:", addressItems.length);
        console.log("【insert finish !】");
        mongoose.disconnect();
        process.exit(0);
    }
}

function insertDB(){
    console.log("insert db. batchItems len:",batchItems.length);
    Address.insertMany(batchItems, function(err, insertDocs){
        if(err){
            console.log("inserDB err:", err);
        }
        nextInsertBatch();
    });
}

var currentBlock;
patchBlocks3();
