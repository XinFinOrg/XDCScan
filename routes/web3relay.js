#!/usr/bin/env node

/*
    Endpoint for client to talk to etc node
*/

var Web3 = require("xdc3");
var web3;

var _ = require('lodash');
var BigNumber = require('bignumber.js');
var etherUnits = require(__lib + "etherUnits.js")
var asyncL = require('async');
var abiDecoder = require('abi-decoder');

require( '../db.js' );
const mongoose = require( 'mongoose' );
const Block     = mongoose.model( 'Block' );
const Contract = mongoose.model( 'Contract' );
const Transaction = mongoose.model( 'Transaction' );
const Market = mongoose.model( 'Market' );
const ActiveAddressesStat = mongoose.model( 'ActiveAddressesStat' );
const TokenTransfer = mongoose.model('TokenTransfer');


var getLatestBlocks = require('./index').getLatestBlocks;
var filterBlocks = require('./filters').filterBlocks;
var filterTrace = require('./filters').filterTrace;

const ERC20ABI = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"from","type":"address"},{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"_totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"acceptOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"to","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"spender","type":"address"},{"name":"tokens","type":"uint256"},{"name":"data","type":"bytes"}],"name":"approveAndCall","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"newOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"tokenAddress","type":"address"},{"name":"tokens","type":"uint256"}],"name":"transferAnyERC20Token","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"tokenOwner","type":"address"},{"name":"spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"tokenOwner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"tokens","type":"uint256"}],"name":"Approval","type":"event"}];

const KnownMethodIDs = {
  "0xa9059cbb": { type: "ERC20", method: "transfer" },
  "0x23b872dd": { type: "ERC20", method: "transferFrom" },
  "0x095ea7b3": { type: "ERC20", method: "approve" },
  "0xf2fde38b": { type: "ERC20", method: "transferOwnership" }
};

/*Start config for node connection and sync*/
// load config.json
var config = { nodeAddr: 'localhost', gethPort: 8545 };
try {
    var local = require('../config.json');
    _.extend(config, local);
    console.log('config.json found.');
} catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
        var local = require('../config.example.json');
        _.extend(config, local);
        console.log('No config file found. Using default configuration... (config.example.json)');
    } else {
        throw error;
        process.exit(1);
    }
}

// load token list
var KnownTokenDecimalDivisors = {};
var KnownTokenInfo = {};
const KnownTokenList = require('../public/' + (config.settings.tokenList || 'tokens.json'));

// prepare token information
const KnownTokens = KnownTokenList.map((token)=> {
  var key = token.address.toLowerCase();
  KnownTokenInfo[key] = token;
  // decimals divisors
  KnownTokenDecimalDivisors[key] = new BigNumber(10).pow(token.decimal);
  return token.address;
});
console.log(config.WSURL,"WSURL")
//Create Web3 connection
console.log('Connecting ' + config.RPCURL +'...');
if (typeof web3 !== "undefined") {
  web3 = new Web3(web3.currentProvider);
} else {
  web3 = new Web3(new Web3.providers.WebsocketProvider(config.WSURL));
}

web3Addr = new Web3(new Web3.providers.HttpProvider('https://rpc.xinfin.network'));

if (web3.eth.net.isListening())
  console.log("Web3 connection established");
else
  throw "No connection, please specify web3host in conf.json";

web3 = require("../lib/trace.js")(web3);

const treasuryAddress = "0x74682fc32007af0b6118f259cbe7bccc21641600";
// var newBlocks = web3.eth.filter("latest");
// var newTxs = web3.eth.filter("pending");

exports.data = async (req, res) => {
  try{
  if ("tx" in req.body) {
    let transactionResponse;
    var txHash = req.body.tx.toLowerCase();

    Transaction.findOne({hash: txHash}).lean(true).exec(async(err, doc) => {
      if (err || !doc) {
        web3.eth.getTransaction(txHash, function(err, tx) {
          if(err || !tx) {
            console.error("TxWeb3 error :" + err)
            if (!tx) {
              web3.eth.getBlock(txHash, function(err, block) {
                if(err || !block) {
                  console.error("BlockWeb3 error :" + err)
                  res.write(JSON.stringify({"error": true}));
                } else {
                  console.log("BlockWeb3 found: " + txHash)
                  res.write(JSON.stringify({"error": true, "isBlock": true}));
                }
                res.end();
              });
            } else {
              res.write(JSON.stringify({"error": true}));
              res.end();
            }
          } else {
            var ttx = tx;
            ttx.value = etherUnits.toEther( new BigNumber(tx.value), "wei");
            //get timestamp from block
            var block = web3.eth.getBlock(tx.blockNumber, function(err, block) {
              if (!err && block)
                ttx.timestamp = block.timestamp;
              ttx.isTrace = (ttx.input != "0x");
              transactionResponse = ttx;
            });
          }
        });
      } else {
        transactionResponse = doc;
      }

        let tokensTrasferred = ``;
        let transfer = await TokenTransfer.findOne({ hash: txHash });
        if (transfer) {
            let contractDetail = await Contract.findOne({ $or: [{ 'address': transfer.contract.toLowerCase() }, { 'address': transfer.contract }] }, { symbol: 1, tokenName: 1, address: 1 }).lean();
            //   tokensTrasferred = `From ${transfer.from} To ${transfer.to} For ${transfer.value} ${contractDetail.tokenName} (${contractDetail.symbol})`;
            let value = etherUnits.toEther( new BigNumber(transfer.value), "wei");
            tokensTrasferred = {
                from: transfer.from,
                to: transfer.to,
                value: value,
                tokenName: contractDetail.tokenName,
                symbol: contractDetail.symbol,
                address: contractDetail.address,
            }
        }

      const latestPrice = await Market.findOne().sort({timestamp: -1})
      let quoteUSD = 0;

      if (latestPrice) {
        quoteUSD = latestPrice.quoteUSD;
        quoteINR = latestPrice.quoteINR;
        quoteEUR = latestPrice.quoteEUR;
      }

      const latestBlock = await Block.find().sort({number:-1}).limit(1);
      transactionResponse.confirmations = (latestBlock[0].number + 1) - transactionResponse.blockNumber;

      if (!transactionResponse.status) {
        transactionResponse.confirmations = 0;
      }
      transactionResponse.gasPriceGwei = web3.utils.fromWei(transactionResponse.gasPrice, 'Gwei');
      transactionResponse.gasPrice = web3.utils.fromWei(transactionResponse.gasPrice, 'ether');
      transactionResponse.transactionFee =  (new Number(transactionResponse.gasPrice * transactionResponse.gasUsed)).toFixed(20);
      transactionResponse.transactionFeeUSD = (new Number(transactionResponse.transactionFee * quoteUSD)).toFixed(20);
      transactionResponse.transactionFeeINR = (new Number(transactionResponse.transactionFee * quoteINR)).toFixed(20);
      transactionResponse.transactionFeequoteEUR = (new Number(transactionResponse.transactionFee * quoteEUR)).toFixed(20);
      transactionResponse.valueUSD = transactionResponse.value * quoteUSD;
      transactionResponse.valueINR = transactionResponse.value * quoteINR;
      transactionResponse.valueEUR = transactionResponse.value * quoteEUR;
      transactionResponse.gasUsedPercent = (transactionResponse.gasUsed / transactionResponse.gas) * 100;
      transactionResponse.tokensTrasferred = tokensTrasferred;
      
      if (transactionResponse.to === treasuryAddress || transactionResponse.from === treasuryAddress) {
        transactionResponse.inputAscii = web3.utils.hexToAscii(transactionResponse.input);
      }

      res.write(JSON.stringify(transactionResponse));
      res.end();
    });

  } else if ("tx_trace" in req.body) {
    var txHash = req.body.tx_trace.toLowerCase();

    asyncL.waterfall([
    function(callback) {
      web3.eth.getTransaction(txHash, function(err, tx) {
        if(err || !tx) {
          return callback({error: true, message: 'Transaction not found.'}, null);
        } else {
          // call web3.trace.*() for tx.input != "0x" cases
          callback(tx.input == "0x", tx);
        }
      });
    }, function(tx, callback) {
      web3.trace.transaction(txHash, function(err, traces) {
        if(err || !traces) {
          console.error("TraceWeb3 error :" + err)
          return callback({ error: true, message: "TraceWeb3 error:" + err }, null);
        } else {
          callback(null, tx, traces);
        }
      });
    }, function(tx, traces, callback) {
      if (tx.to != null) {
        // detect some known contracts
        var methodSig = tx.input.substr(0, 10);
        if (KnownMethodIDs[methodSig]) {
          // is it a token contract ?
          if (KnownMethodIDs[methodSig].type == 'ERC20') {
            var contract = web3.eth.contract(ERC20ABI);
            var token = contract.at(tx.to);

            callback(null, tx, traces, contract, token);
            return;
          }
        }
        Contract.findOne({address: tx.to}).lean(true)
          .exec(function(err, contractDb) {
            if (err || !contractDb) {
              console.log('Contract not found. tx.to = ', tx.to);
              callback(null, tx, traces, null);
              return;
            }
            callback(null, tx, traces, contractDb, null);
          });
      } else {
        // creation contract case
        callback(null, tx, traces, null);
      }
    }], function(error, tx, traces, contractOrDb, tokenContract) {
      if (error) {
        if (error === true)
          error = { error: true, message: 'normal TX' };
        res.write(JSON.stringify(error));
        res.end();
        return;
      }

      // check traces for tokenContract
      if (contractOrDb || tokenContract) {
        var decimals = 0, decimalsBN, decimalsDivisor = 1;

        // convert given contractDB to contract and check validity
        if (!tokenContract && typeof contractOrDb.abi == "string") {
          var abi = [];
          try {
            abi = JSON.parse(contractOrDb.abi);
          } catch (e) {
            console.log("Error parsing ABI:", contractOrDb.abi, e);
            res.write(JSON.stringify({ error: true, message: 'normal TX' }));
            res.end();
            return;
          }
          var contract = web3.eth.contract(abi);
          tokenContract = contract.at(tx.to);
        }

        try {
          decimals = tokenContract.decimals ? tokenContract.decimals() : 0;
        } catch (e) {
          decimals = 0;
        }
        abiDecoder.addABI(tokenContract.abi);

        // prepare to convert transfer unit
        decimalsBN = new BigNumber(decimals);
        decimalsDivisor = new BigNumber(10).pow(decimalsBN);

        var txns = filterTrace(traces);
        txns.forEach(function(trace) {
          if(!trace.error && trace.action.input && tokenContract) {
            trace.callInfo = abiDecoder.decodeMethod(trace.action.input);
            if (trace.callInfo.name == 'transfer') {
              var amount = new BigNumber(trace.callInfo.params[1].value);
              trace.amount = amount.dividedBy(decimalsDivisor);
              // replace to address with _to address arg
              trace.to = trace.callInfo.params[0].value;
              trace.type = 'transfer';
            }
          }
        });
        res.write(JSON.stringify(txns));
      } else {
        res.write(JSON.stringify(filterTrace(traces)));
      }
      res.end();
    });
  } else if ("addr_trace" in req.body) {
    var addr = req.body.addr_trace.toLowerCase();
    // need to filter both to and from
    // from block to end block, paging "toAddress":[addr],
    // start from creation block to speed things up

    var after = 0;
    if (req.body.after) {
      after = parseInt(req.body.after);
      if (after < 0) {
        after = 0;
      }
    }

    var txncount;
    try {
      txncount = await web3Addr.eth.getTransactionCount(addr);
    } catch (e) {
      console.log("No transaction found. ignore.");
      res.write(JSON.stringify({"error": true}));
      res.end();
      return;
    }
    asyncL.waterfall([
      function(callback) {
        // get the creation transaction.
        Transaction.findOne({creates: addr}).lean(true).exec(function(err, doc) {
          if (err || !doc) {
            // no creation transaction found
            // this is normal address
            callback(null, null);
            return;
          }
          callback(null, doc);
        });
      },
      function(transaction, callback) {
        // detect Token contract
        if (transaction) {
          var bytecode = web3Addr.eth.getCode(addr);
          if (bytecode.length > 2) {
            var contract = web3Addr.eth.contract(ERC20ABI);
            var token = contract.at(addr);

            try {
              var supply = token.totalSupply();
            } catch (e) {
              // not a valid token
              callback(null, transaction);
              return;
            }

            // try to get decimals
            var decimals;
            try {
              decimals = token.decimals ? token.decimals() : 0;
            } catch (e) {
              decimals = 0;
            }

            callback(null, transaction, token, decimals);
          }
        } else {
          callback(null, transaction, null, null);
        }
      },
      function(transaction, token, decimals, callback) {
        if (!transaction) {
          web3.eth.getBlock('latest', function(err, block) {
            if(err || !block) {
              console.error("addr_trace error :" + err)
              callback({"error": true}, null);
            } else {
              callback(null, null, null, null, block.number);
            }
          });
        } else {
          callback(null, transaction, token, decimals, null);
        }
      }
    ], function(error, transaction, token, decimals, lastBlockNumber, callback) {
      // check divisor
      if (transaction && token && !KnownTokenDecimalDivisors[addr]) {
        KnownTokenDecimalDivisors[addr] = new BigNumber(10).pow(decimals);
      }
      // prepare abiDecoder
      abiDecoder.addABI(ERC20ABI);

      if (error) {
        console.error("TraceWeb3 error :", error)
        res.write(JSON.stringify(error));
        return;
      }
      // 100000 blocks ~ scan 14 days
      var fromBlock = transaction && transaction.blockNumber || lastBlockNumber - 100000;
      fromBlock = fromBlock < 0 ? 0 : fromBlock;

      //
      var toAddr;
      if (!transaction) {
        // search all known tokens
        toAddr = KnownTokens;
      } else {
        // search selected token contract only
        toAddr = [addr];
      }
      var filter = {"fromBlock": web3.utils.toHex(fromBlock), "toAddress":toAddr};
      filter.count = MAX_ENTRIES;
      if (after) {
        filter.after = after;
      }
      web3.trace.filter(filter, function(err, tx) {
        if(err || !tx) {
          console.error("TraceWeb3 error :" + err)
          res.write(JSON.stringify({"error": true}));
        } else {
          var txns = filterTrace(tx);
          if (!transaction) {
            // normal address cases.
            // show only transfer transactions
            var transfers = [];
            txns.forEach(function(t) {
              if (t.type == "call") {
                // is it transfer action?
                var methodSig = t.action.input ? t.action.input.substr(0, 10) : null;
                var callInfo = {};
                if (methodSig && KnownMethodIDs[methodSig] && KnownMethodIDs[methodSig].method == 'transfer') {
                  callInfo = abiDecoder.decodeMethod(t.action.input);
                } else {
                  return;
                }
                // check from or to address
                var toAddr = callInfo && callInfo.params && callInfo.params[0].value;
                if (t.from !== addr && toAddr !== addr) {
                  return;
                }
                if (callInfo && callInfo.name && callInfo.name == 'transfer') {
                  var tokenAddr = t.to.toLowerCase();
                  // convert amount
                  var amount = new BigNumber(callInfo.params[1].value);
                  t.amount = amount.dividedBy(KnownTokenDecimalDivisors[tokenAddr]).toString(10);
                  // replace to address with _to address arg
                  t.to = callInfo.params[0].value;
                  t.tokenInfo = KnownTokenInfo[tokenAddr];
                  t.callInfo = callInfo;
                  t.type = 'transfer';
                  transfers.push(t);
                }
              }
            });
            res.write(JSON.stringify({transactions: transfers, createTransaction: transaction, after: after, count: filter.count}));
          } else {
            // show all contract transactions
            var transactions = [];
            txns.forEach(function(t) {
              if (t.type == "call") {
                var methodSig = t.action.input ? t.action.input.substr(0, 10) : null;
                var callInfo = {};
                if (methodSig && KnownMethodIDs[methodSig] && KnownMethodIDs[methodSig].method == 'transfer') {
                  // decode transfer action only
                  callInfo = abiDecoder.decodeMethod(t.action.input);
                }
                if (callInfo && callInfo.name && callInfo.name == 'transfer') {
                  // convert amount
                  var amount = new BigNumber(callInfo.params[1].value);
                  t.amount = amount.dividedBy(KnownTokenDecimalDivisors[addr]).toString(10);
                  // replace to address with _to address arg
                  t.to = callInfo.params[0].value;
                  t.callInfo = callInfo;
                  t.type = 'transfer';
                  transactions.push(t);
                } else {
                  transactions.push(t);
                }
              } else {
                transactions.push(t);
              }
            });
            res.write(JSON.stringify({transactions, createTransaction: transaction, after: after, count: filter.count}));
          }
        }
        res.end();
      });
    });
  } else if ("addr" in req.body) {
    var addr = req.body.addr.toLowerCase();
    var options = req.body.options;
    let hackedTag ="";
    if(addr==="xdc6d6f33467529ac73804aad77ef8d8cfe16520ba3"){
      hackedTag="Hacker's Account"
    }
    var addrData = {};

    if (options.indexOf("balance") > -1) {
      try {
        addrData["balance"] = await web3.eth.getBalance(addr);
        addrData["balance"] = etherUnits.toEther(addrData["balance"], 'wei');
      } catch(err) {
        console.error("AddrWeb3 error :" + err);
        addrData = {"error": true};
      }
    }
    if (options.indexOf("count") > -1) {
      try {
         addrData["count"] = await web3.eth.getTransactionCount(addr);
      } catch (err) {
        console.error("AddrWeb3 error :" + err);
        addrData = {"error": true};
      }
    }
    if (options.indexOf("bytecode") > -1) {
      try {
         addrData["bytecode"] = await web3.eth.getCode(addr);
         if (addrData["bytecode"].length > 2)
            addrData["isContract"] = true;
         else
            addrData["isContract"] = false;
      } catch (err) {
        console.error("AddrWeb3 error :" + err);
        addrData = {"error": true};
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

      // is it a ERC20 compatible token?
      // if (addrData["isContract"]) {
      //   var contract = await web3Addr.eth.contract(ERC20ABI);
      //   var token = contract.at(addr);
      //
      //   try {
      //     // FIXME
      //     var supply = token.totalSupply();
      //     addrData["isTokenContract"] = true;
      //   } catch (e) {
      //     // not a valid token
      //     addrData["isTokenContract"] = false;
      //   }
      // }
    }

    const latestPrice = await Market.findOne().sort({timestamp: -1})
    let quoteUSD = 0;

    if (latestPrice) {
      quoteUSD = latestPrice.quoteUSD;
      quoteINR = latestPrice.quoteINR;
      quoteEUR = latestPrice.quoteEUR;
    }
    addrData["balanceEUR"] = addrData.balance * quoteEUR;
    addrData["quoteEUR"] = quoteEUR;
    addrData["balanceINR"] = addrData.balance * quoteINR;
    addrData["quoteINR"] = quoteINR;
    addrData["balanceUSD"] = addrData.balance * quoteUSD;
    addrData["quoteUSD"] = quoteUSD;
    addrData["hackedTag"] = hackedTag;


    res.write(JSON.stringify(addrData));
    res.end();
  } else if ("block" in req.body) {
    var blockNumOrHash;
    if (/^(0x)?[0-9a-f]{64}$/i.test(req.body.block.trim())) {
        blockNumOrHash = req.body.block.toLowerCase();
    } else {
        blockNumOrHash = parseInt(req.body.block);
    }
    Block.find({$or: [{hash: blockNumOrHash}, {number: blockNumOrHash}]}).lean(true).exec(function(err, doc) {
      if (err || doc.length === 0) {
        web3.eth.getBlock(blockNumOrHash, function(err, block) {
          if(err || !block) {
            console.error("BlockWeb3 error :" + err)
            res.write(JSON.stringify({"error": true}));
          } else {
            res.write(JSON.stringify(filterBlocks(block)));
          }
          res.end();
        });
      } else {
        doc = doc[0];
        Transaction.find({blockNumber: doc.number}).distinct("hash", (err, txs) => {
          doc["transactions"] = txs;
          res.write(JSON.stringify(filterBlocks(doc)));
          res.end();
        });
      }
    });

    /*
    / TODO: Refactor, "block" / "uncle" determinations should likely come later
    / Can parse out the request once and then determine the path.
    */
  } else if ("uncle" in req.body) {
    var uncle = req.body.uncle.trim();
    var arr = uncle.split('/');
    var blockNumOrHash; // Ugly, does the same as blockNumOrHash above
    var uncleIdx = parseInt(arr[1]) || 0;

    if (/^(?:0x)?[0-9a-f]{64}$/i.test(arr[0])) {
      blockNumOrHash = arr[0].toLowerCase();
      console.log(blockNumOrHash)
    } else {
      blockNumOrHash = parseInt(arr[0]);
    }

    if (typeof blockNumOrHash == 'undefined') {
      console.error("UncleWeb3 error :" + err);
      res.write(JSON.stringify({"error": true}));
      res.end();
      return;
    }

    web3.eth.getBlock(blockNumOrHash, uncleIdx, async (err, uncle) =>  {
      if(err || !uncle) {
        console.error("UncleWeb3 error :" + err)
        res.write(JSON.stringify({"error": true}));
      } else {
        res.write(JSON.stringify(filterBlocks(uncle)));
      }
      res.end();
    });

  } else if ("action" in req.body) {
    if (req.body.action == 'hashrate') {
      latestBlock = await Block.find().sort({number:-1}).limit(1);

      if(latestBlock.length === 0) {
        console.error("blockFind error :" + err);
        res.write(JSON.stringify({"error": true}));
        res.end();
      }

      latest = latestBlock[0];

      var checknum = latest.number - 100;
      if(checknum < 0)
        checknum = 0;
      var nblock = latest.number - checknum;

      const activeAddressesStat = await ActiveAddressesStat.find().sort({blockNumber: -1}).limit(1);
      const latestPrice = await Market.findOne().sort({timestamp: -1})
      let quoteUSD = 0;
      let quoteINR = 0;
      let quoteEUR = 0;
      if (latestPrice) {
        quoteUSD = latestPrice.quoteUSD;
        quoteINR = latestPrice.quoteINR;
        quoteEUR = latestPrice.quoteEUR;
      }

      let activeAddresses = 0;
      let cloTransferredAmount = 0;

      if (activeAddressesStat.length > 0) {
        activeAddresses = activeAddressesStat[0].count;
      }


      const blockChecknum = await Block.findOne({number: checknum});

      if (blockChecknum) {
        var blocktime = (latest.timestamp - blockChecknum.timestamp) / nblock;
        var hashrate = latest.difficulty / blocktime;
        res.write(JSON.stringify(
            {
              "blockHeight": latest.number,
              "difficulty": latest.difficulty,
              "blockTime": blocktime,
              "hashrate": hashrate,
              activeAddresses: activeAddresses,
              cloTransferredAmount: cloTransferredAmount,
              quoteUSD: quoteUSD,
              quoteINR: quoteINR,
              quoteEUR: quoteEUR,
            }));
      } else {
        res.write(JSON.stringify(
            {
              "blockHeight": latest.number,
              "difficulty": latest.difficulty,
              "blockTime": 0,
              "hashrate": 0,
              activeAddresses: activeAddresses,
              cloTransferredAmount: cloTransferredAmount
            }));
      }

      res.end();
    } else {
      console.error("Invalid Request: " + action)
      res.status(400).send();
    }
  } else {
    console.error("Invalid Request: " + action)
    res.status(400).send();
  }
  }
  catch(e){
    console.log(`got an error at Web3Relay ${e}`)
  }


};

const MAX_ENTRIES = 50;
exports.web3 = web3;
exports.eth = web3.eth;
