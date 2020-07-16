var mongoose = require( 'mongoose' );
const axios = require("axios");
const WebSocket = require("ws");
let price = require('../tools/price')
let Market = mongoose.model( 'Market' );
var Block     = mongoose.model('Block');
var Transaction = mongoose.model('Transaction');
var Account = mongoose.model('Account');
let ActiveAddressesStat = mongoose.model( 'ActiveAddressesStat' );

var filters = require('./filters');
var eth = require("./web3relay").eth;




var async = require('async');
const ws = new WebSocket("wss://wsapi.homiex.com/openapi/quote/ws/v1");
let homieExData;
let BlockSigners = "xdc0000000000000000000000000000000000000089";
let RandomizeSMC = "xdc0000000000000000000000000000000000000090";

// module.exports = function(app){
  var web3relay = require('./web3relay');
  ws.on('open', function open() {
    // console.log("[*] connected to the homiex wss")
    ws.send(JSON.stringify({ "ping": Date.now() }));
    setInterval(() => {
      ws.send(JSON.stringify({ "ping": Date.now() }));
    }, 120000);
    ws.send(JSON.stringify({
      "symbol": "XDCEUSDT",
      "topic": "realtimes",
      "event": "sub",
      "params": {
        "binary": false
      }
    }))
  });


// ws.on('message', function incoming(data) {
//   const currData = JSON.parse(data);
//   if (Object.keys(currData).includes("symbol")) {
//     // not a pong message
//     homieExData = currData;
//     console.log(homieExData,"homieExData")
//   }
// });

var contracts = require('../contractTpl/contracts.js');
var masterNodeContract;
var web3relay;
var contractAddress = "xdc0000000000000000000000000000000000000088";
var burntAddress = "xdc0000000000000000000000000000000000000000";
let resignMNCount = 11;
let epochRewards = 4500;
let epochInDay = 48;
let burntBalance, totalMasterNodesVal, totalStakedValueVal, mnDailyRewards, totalXDC, cmc_xdc_price;
module.exports = function (app) {
  web3relay = require('./web3relay');

  var Token = require('./token');
  var addressListData = require('./addressListData');
  var tokenListData = require('./tokenListData');
  var contractListData = require('./contractListData');
  var transactionData = require('./transactionData');
  var tokenTransfer = require('./tokenTransfer');
  var witnessData = require('./witnessData');
  var witnessListData = require('./witnessListData');
  var compile = require('./compiler');
  var fiat = require('./fiat');
  var stats = require('./stats');
  var richList = require('./richlist');
  var eventLog = require('./eventLog.js');
  var publicAPI = require("./publicAPIData");

  app.post('/addr', getAddr);
  app.post('/addrTXcounts', addrTXcounts);
  
  app.post('/tx', getTx);
  app.post('/block', getBlock);
  app.post('/data', getData);
  app.get('/publicAPI', publicAPI);//all public APIs
  app.get('/totalXDC', publicAPI.getTotalXDC);
  app.get('/getcirculatingsupply', publicAPI.getCirculatingSupply);

  app.get('/totalXDCSupply', getTotalXDCSupply);

  //masternode routes
  const masterNodeController = require('../controller/masterNodeController');
  // var masternodeRouter = require('./masterNode');
  app.get('/masternode/list', masterNodeController.list);
  app.get('/masternode/savemndetails', masterNodeController.saveMNDetails);
  app.get('/masternode/updatemndetails', masterNodeController.updateMNDetails);
  app.post('/masternode/rewards', masterNodeController.rewards);

  //app.post('/daorelay', DAO);
  app.post('/addressListData', addressListData);
  app.get('/addressListData', addressListData);
  app.post('/tokenrelay', Token);
  app.post('/tokenListData', tokenListData);
  app.post('/contractListData', contractListData);
  app.post('/transactionRelay', transactionData);
  app.post('/tokenTransfer', tokenTransfer);
  app.post('/witnessData', witnessData);
  app.post('/witnessListData', witnessListData);
  app.get('/witnessListData', witnessListData);
  app.post('/eventLog', eventLog);
  app.post('/web3relay', web3relay.data);
  app.post('/compile', compile);
  app.post('/publicAPI', publicAPI);//all public APIs

  app.post('/fiat', fiat);
  app.post('/stats', stats);
  // app.post('/todayRewards', todayRewards);
  // app.post('/totalStakedValue', totalStakedValue)
  // app.post('/totalBurntValue', totalBurntValue)
  // app.post('/totalXDCStakedValue', totalXDCStakedValue)
  // app.post('/totalXDCBurntValue', totalXDCBurntValue)
  // app.post('/totalMasterNodes', totalMasterNodes);
  app.post('/CMCPrice', totalMasterNodes);
  app.post('/getXinFinStats', getXinFinStats)
  app.get('/getXinFinStats', getXinFinStats)


  /**
   *totalMasterNodes:totalMasterNodes,
    totalStakedValue:totalStakedValue,
    mnDailyRewards:mnDailyRewards,
    totalXDC:totalXDC,       
    monthlyRewards: parseFloat(mnDailyRewards) * 31,
    monthlyRewardPer: ((parseFloat(mnDailyRewards) * 31) / 10000000) * 100,
    yearlyRewardPer: ((parseFloat(mnDailyRewards) * 31 * 12) / 10000000) * 100,
    priceUsd: cmc_xdc_price.price,
    xdcVol24HR: parseFloat(homieExData.data[0].v) + parseFloat(alphaExVol.data.xdcVolume)
   */


  // xinfinSiteStatTicker();

  // setInterval(xinfinSiteStatTicker, 1000000);

  // async function xinfinSiteStatTicker() {
  //   try {
  //     console.log("called xinfinSiteStatTicker");
  //     burntBalance = web3relay.eth.getBalance(burntAddress) / Math.pow(10, 18)
  //     totalMasterNodesVal = "";
  //     let mnCandidateCnt;
  //     if (!masterNodeContract) {
  //       masterNodeContract = new web3relay.eth.Contract(contracts.masterNodeABI, contractAddress);
  //     }
  //     if (masterNodeContract) {
  //       mnCandidateCnt = masterNodeContract.methods.getCandidates().length
  //       totalMasterNodesVal = (String(mnCandidateCnt - resignMNCount));
  //     }

  //     totalStakedValueVal = web3relay.eth.getBalance(contractAddress) / Math.pow(10, 18)

  //     if (!masterNodeContract) {
  //       masterNodeContract = new web3relay.eth.Contract(contracts.masterNodeABI, contractAddress);
  //     }
  //     if (masterNodeContract) {
  //       let mnCount = mnCandidateCnt - resignMNCount
  //       // let epoch = (eth.blockNumber / 900).toFixed()
  //       mnDailyRewards = ((epochRewards / mnCount) * epochInDay).toFixed(0)
  //     }

      totalBlockNum = eth.blockNumber;
      totalXDC = (37500000000 + 5.55 * totalBlockNum).toFixed();

  //     alphaExVol = await axios.get("https://api2.alphaex.net/api/xdcVolume");

  //     const cmc_xdc_data = 2
  //     cmc_xdc_price = cmc_xdc_data.data.data["2634"].quote.USD;


  //   } catch (e) {
  //     console.log("exception ar routes.index.getXinFinStats: ", e);
  //   }
  // }



  /*
    Local DB: data request format
    { "address": "0x1234blah", "txin": true }
    { "tx": "0x1234blah" }
    { "block": "1234" }
  */
  app.post('/richlist', richList);
  app.post('/addr', getAddr);
  app.post('/addr_count', getAddrCounter);
  app.post('/tx', getTx);
  app.post('/block', getBlock);
  app.post('/data', getData);
  app.get('/total', getTotal);
  //app.post('/daorelay', DAO);
  app.post('/addressListData', addressListData);
  app.get('/addressListData', addressListData);
  app.post('/tokenrelay', Token);
  app.post('/tokenListData', tokenListData);
  app.post('/contractListData', contractListData);
  app.post('/transactionRelay', transactionData);
  app.post('/tokenTransfer', tokenTransfer);
  app.post('/witnessData', witnessData);
  app.post('/witnessListData', witnessListData);
  app.get('/witnessListData', witnessListData);
  app.post('/eventLog', eventLog);
  app.post('/tokenrelay', Token);
  app.post('/web3relay', web3relay.data);
  app.post('/compile', compile);
  app.post('/publicAPI', publicAPI);//all public APIs

  app.post('/fiat', fiat);
  app.post('/stats', stats);
  app.post('/todayRewards', todayRewards);
  app.post('/totalStakedValue', totalStakedValue)
  app.post('/totalBurntValue', totalBurntValue)
  app.post('/totalXDCStakedValue', totalXDCStakedValue)
  app.post('/totalXDCBurntValue', totalXDCBurntValue)
  app.post('/totalMasterNodes', totalMasterNodes);
  app.post('/CMCPrice', totalMasterNodes);
  app.post('/getXinFinStats', getXinFinStats);
  app.post('/getCmcDataUsd', (req, res) => {
    getCMCData().then(data => {
      res.status(200).json({ data: data.data.data["2634"].quote.USD })
    }).catch(e => {
      console.log("[*] exception at routes.index.getCmcDataUsd: ", e);
      res.status(500).json({ error: "server error" });
    })
  });

}

const getAddr = async (req, res) => {
  // TODO: validate addr and tx
  var addr = req.body.addr.toLowerCase();
  var count = parseInt(req.body.count);

  var limit = parseInt(req.body.length);
  var start = parseInt(req.body.start);

  var data = { draw: parseInt(req.body.draw), recordsFiltered: count, recordsTotal: count, mined: 0 };

  var addrFind = Transaction.find( { $or: [{"to": addr}, {"from": addr}] })

  var sortOrder = '-blockNumber';
  if (req.body.order && req.body.order[0] && req.body.order[0].column) {
    // date or blockNumber column
    if (req.body.order[0].column == 1 || req.body.order[0].column == 6) {
      if (req.body.order[0].dir == 'asc') {
        sortOrder = 'blockNumber';
      }
    }
  }

  addrFind.lean(true).sort(sortOrder).skip(start).limit(limit).exec("find", function (err, docs) {
      if (docs)
        data.data = filters.filterTX(docs, addr);
      else
        data.data = [];
      res.write(JSON.stringify(data));
      res.end();
  });

};

var addrTXcounts = function (req, res) {
  addr = req.body.address;
  try {
    Transaction.count({ $or: [{ "to": addr }, { "from": addr }] }).exec().then(function (result) {
      res.write(JSON.stringify({ "count": result }));
      res.end();
    })
  } catch (err) {
    console.log("addrTXcounts err: ", err);
    res.write(JSON.stringify({ "count": 0 }));
    res.end();
  }
}
var getAddrCounter = function(req, res) {
  var addr = req.body.addr.toLowerCase();
  var count = parseInt(req.body.count);
  var data = { recordsFiltered: count, recordsTotal: count, mined: 0 };

  async.waterfall([
  function(callback) {

  Transaction.count({ $or: [{"to": addr}, {"from": addr}] }, function(err, count) {
    if (!err && count) {
      // fix recordsTotal
      data.recordsTotal = count;
      data.recordsFiltered = count;
    }
    callback(null);
  });

  }, function(callback) {

  Block.count({ "miner": addr }, function(err, count) {
    if (!err && count) {
      data.mined = count;
    }
    callback(null);
  });

  }], function (err) {
    res.write(JSON.stringify(data));
    res.end();
  });

};
var getBlock = function(req, res) {
  // TODO: support queries for block hash
  var txQuery = "number";
  var number = parseInt(req.body.block);

  var blockFind = Block.findOne( { number : number }).lean(true);
  blockFind.exec(function (err, doc) {
    if (err || !doc) {
      console.error("BlockFind error: " + err)
      // console.error(req.body);
      res.write(JSON.stringify({"error": true}));
    } else {
      var block = filters.filterBlocks([doc]);
      res.write(JSON.stringify(block[0]));
    }
    res.end();
  });
};

var getTx = function(req, res){
  var tx = req.body.tx.toLowerCase();
  var txFind = Block.findOne( { "transactions.hash" : tx }, "transactions timestamp").lean(true);
  txFind.exec(function (err, doc) {
    if (!doc){
      console.log("missing: " +tx)
      res.write(JSON.stringify({}));
      res.end();
    } else {
      // filter transactions
      var txDocs = filters.filterBlock(doc, "hash", tx)
      res.write(JSON.stringify(txDocs));
      res.end();
    }
  });
};
/*
  Fetch data from DB
*/
var getData = function(req, res){
  // TODO: error handling for invalid calls
  var action = req.body.action.toLowerCase();
  var limit = req.body.limit

  if (action in DATA_ACTIONS) {
    if (isNaN(limit))
      var lim = MAX_ENTRIES;
    else
      var lim = parseInt(limit);
    DATA_ACTIONS[action](lim, res);
  } else {
    console.error("Invalid Request: " + action)
    res.status(400).send();
  }
};

/*
  Total supply API code
*/
var getTotal = function(req, res) {
  Account.aggregate([
    { $group: { _id: null, totalSupply: { $sum: '$balance' } } }
  ]).exec(function(err, docs) {
    if (err) {
      res.write("Error getting total supply");
      res.end()
    }
    res.write(docs[0].totalSupply.toString());
    res.end();
  });
}

/*
  temporary blockstats here
*/
var latestBlock = function(req, res) {
  var block = Block.findOne({}, "totalDifficulty")
                      .lean(true).sort('-number');
  block.exec(function (err, doc) {
    res.write(JSON.stringify(doc));
    res.end();
  });
}


var getLatest = function(lim, res, callback) {
  var blockFind = Block.find({}, "number transactions timestamp miner extraData")
                      .lean(true).sort('-number').limit(lim);
  blockFind.exec(function (err, docs) {
    callback(docs, res);
  });
}

var regDecimal = function (nb, decimalNum) {
  var integerPart = parseInt(nb);
  var decimalPart = parseInt((nb - integerPart) * 10 ** decimalNum) / (10 ** decimalNum);
  if (decimalPart == 0)
    return integerPart;
  return integerPart + decimalPart;
}

// var todayRewards = function(req, res) {
//   var nowDate = new Date();
//   var todaySeconds = nowDate.getHours()*3600+nowDate.getMinutes()*60+nowDate.getSeconds();
//   var fromDayTime = parseInt(nowDate.getTime()/1000)-todaySeconds;
//   Block.count({'timestamp':{$gt:fromDayTime}}).exec(function(err,c){
//     if(err){
//       console.log(err);
//       res.end();
//       return;
//     }
//     res.write(String(regDecimal(0.3375*c, 4)));
//     res.end();
//   });
// }

var todayRewards = async function (req, res) {


  if (!masterNodeContract) {
    masterNodeContract = new web3relay.eth.Contract(contracts.masterNodeABI, contractAddress);
  }
  if (masterNodeContract) {
    let mnCount = await masterNodeContract.methods.getCandidates().call() 
    mnCount = mnCount.length- resignMNCount
    let mnDailyRewards = ((epochRewards / mnCount) * epochInDay).toFixed(0)
    res.write(String(mnDailyRewards));
  }
  res.end();

}

var totalMasterNodes = async function  (req, res) {
  if (!masterNodeContract) {
    masterNodeContract = new web3relay.eth.Contract(contracts.masterNodeABI, contractAddress);
  }
  let getCandidates = await masterNodeContract.methods.getCandidates().call()
  if (masterNodeContract) {
    res.write(String(getCandidates.length - resignMNCount));
  }
  res.end();
}

function fnum(x) {
  if (isNaN(x)) return x;

  if (x < 9999) {
    return x;
  }

  if (x < 1000000) {
    return Math.round(x / 1000) + " K XDC";
  }
  if (x < 10000000) {
    return (x / 1000000).toFixed(2) + " Million XDC";
  }

  if (x < 1000000000) {
    return Math.round((x / 1000000)) + " Million XDC";
  }

  if (x < 1000000000000) {
    return Math.round((x / 1000000000)) + " Billion XDC";
  }

  return "1T+";
}
var getTotalXDCSupply = function (req, res) {
  burntBalance = web3relay.eth.getBalance(burntAddress).toPrecision() / Math.pow(10, 18)
  totalBlockNum = eth.blockNumber;
  respData = ((37500000000 + 5.55 * totalBlockNum)-burntBalance).toFixed() ;
  res.write(String(respData,burntBalance));
  res.end();
}

var totalStakedValue = async function (req, res) {
  let balace = await web3relay.eth.getBalance(contractAddress) / Math.pow(10, 18)
  res.write(fnum(balace));
  res.end();
}
var totalBurntValue = async function (req, res) {
  let balace = await web3relay.eth.getBalance(burntAddress) / Math.pow(10, 18)
  // res.write(fnum(balace));
  res.end();
}
var totalXDCStakedValue = async function (req, res) {
  let balace = await web3relay.eth.getBalance(contractAddress) / Math.pow(10, 18)
  res.write(balace);
  res.end();
}
var totalXDCBurntValue = async function (req, res) {
  let balace = await web3relay.eth.getBalance(burntAddress) / Math.pow(10, 18)
  res.write(balace);
  res.end();
}
var firstDayTime = 1559211559;
var oneDaySeconds = 86400;
/* get blocks from db */
var sendBlocks = async function(lim, res) {
  let activeAddresses = 0;
  if (!masterNodeContract) {
    masterNodeContract = new web3relay.eth.Contract(contracts.masterNodeABI, contractAddress);
  }

  var blockHetht = await web3relay.eth.getBlockNumber();
  const latestPrice = await Market.findOne().sort({timestamp: -1})
  if (latestPrice) {
    quoteUSD = latestPrice.quoteUSD;
    
  }

  let transactionCount = await Transaction.count();
  let accountsCount = await Account.count();

    let mnCount = await masterNodeContract.methods.getCandidates().call() 
    mnCount = mnCount.length- resignMNCount
    let mnDailyRewards = ((epochRewards / mnCount) * epochInDay).toFixed(0)
    let totalXDCBurntValue = await web3relay.eth.getBalance(burntAddress) / Math.pow(10, 18)
    let totalXDCStakedValue = await web3relay.eth.getBalance(contractAddress) / Math.pow(10, 18)
    let totalXDCSupply = ((37500000000 + 5.55 * blockHetht)-totalXDCBurntValue).toFixed() ;
    let getCandidates = await masterNodeContract.methods.getCandidates().call()
    let totalMNCount = getCandidates.length - resignMNCount


    var blockFind = Block.find({}, "number txs timestamp miner extraData")
                      .lean(true).sort('-number').limit(lim);
        blockFind.exec(function (err, docs) {
          if (err) {
            // console.log(err);
            res.end();
            return;
          }
      
          docs = filters.filterBlocks(docs);
          var result = { "blocks": docs };
          if (docs.length > 1) {
            result.blockHeight = blockHetht;
            var totalTXs = 0;
            // console.log(docs)
            var costTime = docs[0].timestamp - docs[docs.length - 1].timestamp;
            result.blockTime = costTime / (docs.length - 1);
            result.blockTime = Math.round(result.blockTime * 1000) / 1000;
            for (var i = 0; i < docs.length; i++) {
              if (docs[i].txs)
                totalTXs += docs[i].txs.length;
            }
            result.quoteUSD = quoteUSD;
            result.accountsCount = accountsCount;
            result.transactionCount = transactionCount;
            result.percent_change_24h = latestPrice.percent_change_24h;
            result.todayRewards = mnDailyRewards;
            result.totalXDCBurntValue = totalXDCBurntValue;
            result.totalXDCStakedValue = totalXDCStakedValue.toFixed();
            result.totalXDCSupply = totalXDCSupply;
            result.totalMNCount = totalMNCount;
            result.activeAddresses = activeAddresses;
            result.TPS = totalTXs / costTime;
            result.TPS = Math.round(result.TPS * 1000) / 1000;
          }

          res.write(JSON.stringify(result));
          res.end();
  });
}
const getXinFinStats = async function (lim, res) {
  const latestPrice = await Market.findOne().sort({timestamp: -1})
  if (latestPrice) {
    quoteUSD = latestPrice.quoteUSD;
  }
  burntBalance = await web3relay.eth.getBalance(burntAddress) / Math.pow(10, 18)
  totalMasterNodesVal = "";
  let mnCandidateCnt;
  if (!masterNodeContract) {
    masterNodeContract = new web3relay.eth.Contract(contracts.masterNodeABI, contractAddress);
  }
  if (masterNodeContract) {
    mnCandidateCnt = await masterNodeContract.methods.getCandidates().call()
    totalMasterNodesVal = (String(mnCandidateCnt.length - resignMNCount));
    mnDailyRewards = ((epochRewards / totalMasterNodesVal) * epochInDay).toFixed()

  }
    totalBlockNum = await eth.getBlockNumber();
    totalXDC = 37500000000 + 5.55 * totalBlockNum;
    percent_change_24h = latestPrice.percent_change_24h;
    console.log(quoteUSD,"quoteUSD")
    totalStakedValueVal = await web3relay.eth.getBalance(contractAddress) / Math.pow(10, 18)

  res.write(JSON.stringify({
    totalMasterNodes: totalMasterNodesVal,
    totalStakedValue: totalStakedValueVal,
    totalStakedValueFiat: (parseFloat(totalStakedValueVal) * parseFloat(quoteUSD)).toFixed(),
    burntBalance: (burntBalance).toFixed(),
    mnDailyRewards: mnDailyRewards,
    totalXDC: totalXDC,
    totalXDCFiat: (totalXDC * parseFloat(quoteUSD)).toFixed(),
    monthlyRewards: (parseFloat(mnDailyRewards) * 30).toFixed(),
    monthlyRewardsFiat: (parseFloat(mnDailyRewards) * 30 * parseFloat(quoteUSD)).toFixed(),
    monthlyRewardPer: (((parseFloat(mnDailyRewards) * 30) / 10000000) * 100).toFixed(2),
    yearlyRewardPer: (((parseFloat(mnDailyRewards) * 365) / 10000000) * 100).toFixed(2),
    priceUsd: quoteUSD,
    // xdcVol24HR: (parseFloat(cmc_xdc_price["volume_24h"]) + parseFloat(homieExData.data[0].v) * parseFloat(cmc_xdc_price.price) + parseFloat(alphaExVol.data.xdcVolume) * parseFloat(cmc_xdc_price.price)).toFixed()
    xdcVol24HR: (parseFloat(percent_change_24h)  + parseFloat(alphaExVol.data.xdcVolume) * parseFloat(quoteUSD)).toFixed()
  }));
  res.end()

}

var sendTxs = function(lim, res) {
  Transaction.find({"to":{$nin:[BlockSigners,RandomizeSMC]}}).lean(true).sort('-blockNumber').limit(lim)
        .exec(function (err, txs) {
          res.write(JSON.stringify({"txs": txs}));
          res.end();
        });
}

const MAX_ENTRIES = 10;

const DATA_ACTIONS = {
  "latest_blocks": sendBlocks,
  "latest_txs": sendTxs
}

// //listen every token in db
// var eth = require('./web3relay').eth;
// var TokenTransferGrabber = require('./grabTokenTransfer');
// TokenTransferGrabber.Init(eth);
// var ContractFind = Contract.find({ERC:{$gt:0}}).lean(true);
// var transforEvent;
// ContractFind.exec(function(err, doc){
//   if(doc){
//     for(var i=0; i<doc.length; i++){
//       transforEvent = TokenTransferGrabber.GetTransferEvent(doc[i].abi, doc[i].address)
//       TokenTransferGrabber.ListenTransferTokens(transforEvent);
//     }

//   }
// })