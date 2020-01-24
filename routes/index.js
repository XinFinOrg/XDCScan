var mongoose = require( 'mongoose' );

var Block     = mongoose.model( 'Block' );
var Transaction = mongoose.model( 'Transaction' );
// var Contract = mongoose.model('Contract');
// var Witness = mongoose.model( 'Witness' );
var filters = require('./filters')
var eth = require("./web3relay").eth;


var contracts = require('../contractTpl/contracts.js');
var masterNodeContract;
var web3relay;
var contractAddress = "0x0000000000000000000000000000000000000088";
var burntAddress = "0x0000000000000000000000000000000000000000";
let resignMNCount = 5;
let epochRewards = 5000;
let epochInDay = 48;
module.exports = function(app){
  web3relay = require('./web3relay');

  //var DAO = require('./dao');
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
  var eventLog = require('./eventLog.js');
  var publicAPI = require("./publicAPIData");


  /* 
    Local DB: data request format
    { "address": "0x1234blah", "txin": true } 
    { "tx": "0x1234blah" }
    { "block": "1234" }
  */
  app.post('/addr', getAddr);
  app.post('/addrTXcounts', addrTXcounts);
  app.post('/tx', getTx);
  app.post('/block', getBlock);
  app.post('/data', getData);
  app.get('/publicAPI', publicAPI);//all public APIs
  app.get('/totalXDC', publicAPI.getTotalXDC);
  app.get('/totalXDCSupply', getTotalXDCSupply);

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
  app.post('/todayRewards', todayRewards);
  app.post('/totalStakedValue', totalStakedValue)
  app.post('/totalBurntValue', totalBurntValue)
  app.post('/totalXDCStakedValue', totalXDCStakedValue)
  app.post('/totalXDCBurntValue', totalXDCBurntValue)
  app.post('/totalMasterNodes', totalMasterNodes);
  app.post('/CMCPrice', totalMasterNodes);
  
}

var getAddr = function(req, res){
  // TODO: validate addr and tx
  var addr = req.body.addr.toLowerCase();
  var count = parseInt(req.body.count);
  var totalTX = parseInt(req.body.totalTX);
  var limit = parseInt(req.body.length);
  var start = parseInt(req.body.start);
  var data = { draw: parseInt(req.body.draw), recordsFiltered: count, recordsTotal: count };

  // Transaction.count({ $or: [{"to": addr}, {"from": addr}] }).exec().then(function(recordCount)
  //   {
      data.recordsFiltered = totalTX;
      data.recordsTotal = totalTX;

      var addrFind = Transaction.find( { $or: [{"to": addr}, {"from": addr}] })
      addrFind.lean(true).sort('-blockNumber').skip(start).limit(limit).exec("find", function (err, docs) {
        if(err){
          console.log("getAddr err: ",err);
          res.write(JSON.stringify(data));
          res.end();
        }
        if (docs)
          data.data = filters.filterTX(docs, addr);      
        else 
          data.data = [];
        
        res.write(JSON.stringify(data));
        res.end();
      });
    // })
  
};

var addrTXcounts = function(req, res){
  addr = req.body.address;
  try{
    Transaction.count({$or: [{"to": addr}, {"from": addr}] }).exec().then(function(result){
      res.write(JSON.stringify({"count":result}));
      res.end();
    })
  }catch(err){
    console.log("addrTXcounts err: ", err);
    res.write(JSON.stringify({"count":0}));
    res.end();
  }
}
 


var getBlock = function(req, res) {
  // TODO: support queries for block hash
  var txQuery = "number";
  var number = parseInt(req.body.block);
  if(isNaN(number) || !number){
    res.write(JSON.stringify({"error": true}));
    res.end();
    return;
  }
  var blockFind = Block.findOne( { number : number }, "number timestamp hash parentHash sha3Uncles miner difficulty totalDifficulty gasLimit gasUsed nonce witness extraData txs").lean(true);
  blockFind.exec(function (err, doc) {
    var resultBlockData;
    if (err) {
      console.error("BlockFind error: " + err)
      console.error(req.body);
      resultBlockData = {"error": true};
    }else if(!doc){
      var blockData = web3relay.getBlock(number);
      if(blockData){
        blockData.txs = blockData.transactions;
        var blocks = filters.filterBlocks([blockData]);
        resultBlockData = blocks[0];
      }else{
        resultBlockData = {};
      }
        
    } else {
      var blocks = filters.filterBlocks([doc]);
      resultBlockData = blocks[0];
    }
    res.write(JSON.stringify(resultBlockData));
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

var getTotalXDC = function(req, res) {
  var block = Block.findOne({}, "number")
                      .lean(true).sort('-number');
  block.exec(function (err, doc) {
    // res.write(JSON.stringify(doc));
    var total = 194000000 + (doc.number - 4936270) * 1.8;
    res.write(total.toString());
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

var regDecimal = function(nb, decimalNum){
  var integerPart = parseInt(nb);
  var decimalPart = parseInt((nb - integerPart)*10**decimalNum)/(10**decimalNum);
  if(decimalPart==0)
    return integerPart;
  return integerPart+decimalPart;
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

var todayRewards = function(req, res) {
   
  
  if(!masterNodeContract){
    var contractOBJ = web3relay.eth.contract(contracts.masterNodeABI);
    masterNodeContract = contractOBJ.at(contractAddress);
    }
  if(masterNodeContract){
    let mnCount = masterNodeContract.getCandidates().length - resignMNCount
    let epoch = (eth.blockNumber / 900).toFixed()
    let mnDailyRewards = ((epochRewards / mnCount) * epochInDay).toFixed(0)
    
    res.write(String(mnDailyRewards)) ;
  }
  res.end();

}

var totalMasterNodes = function(req, res) {
  if(!masterNodeContract){
    var contractOBJ = web3relay.eth.contract(contracts.masterNodeABI);
    masterNodeContract = contractOBJ.at(contractAddress);
    }
  if(masterNodeContract){
    res.write(String(masterNodeContract.getCandidates().length - resignMNCount));
  }
  res.end();
}

function fnum(x) {
	if(isNaN(x)) return x;

	if(x < 9999) {
		return x;
	}

	if(x < 1000000) {
		return Math.round(x/1000) + " K XDC";
	}
	if( x < 10000000) {
		return (x/1000000).toFixed(2) + " Million XDC";
	}

	if(x < 1000000000) {
		return Math.round((x/1000000)) + " Million XDC";
	}

	if(x < 1000000000000) {
		return Math.round((x/1000000000)) + " Billion XDC";
	}

	return "1T+";
}
var getTotalXDCSupply = function(req, res){
  totalBlockNum = eth.blockNumber;
  respData = 37500000000+5.55*totalBlockNum;
  res.write(String(respData));
  res.end();
}

var totalStakedValue = function(req, res) {
  let balace = web3relay.eth.getBalance(contractAddress).toPrecision()/Math.pow(10,18)
  res.write(fnum(balace));
  res.end();
}
var totalBurntValue = function(req, res) {
  let balace = web3relay.eth.getBalance(burntAddress).toPrecision()/Math.pow(10,18)
  res.write(fnum(balace));
  res.end();
}
var totalXDCStakedValue = function(req, res) {
  let balace = web3relay.eth.getBalance(contractAddress).toPrecision()/Math.pow(10,18)
  res.write(balace);
  res.end();
}
var totalXDCBurntValue = function(req, res) {
  let balace = web3relay.eth.getBalance(burntAddress).toPrecision()/Math.pow(10,18)
  res.write(balace);
  res.end();
}
var firstDayTime = 1559211559;
var oneDaySeconds = 86400;
/* get blocks from db */
var sendBlocks = function(lim, res) {
  var blockHetht = web3relay.eth.blockNumber;
  var blockFind = Block.find({}, "number txs timestamp miner extraData").lean(true).sort('-number').limit(lim);
  blockFind.exec(function (err, docs) {
    if(err){
      console.log(err);
      res.end();
      return;
    }
    
    docs = filters.filterBlocks(docs);
    var result = {"blocks": docs};
    if(docs.length>1){
      result.blockHeight = blockHetht;
      var totalTXs = 0;
      var costTime = docs[0].timestamp-docs[docs.length-1].timestamp;
      result.blockTime = costTime/(docs.length-1);
      result.blockTime = Math.round(result.blockTime*1000)/1000;
      for(var i=0; i<docs.length; i++){
        if(docs[i].txs)
          totalTXs+=docs[i].txs.length;
      }
      
      result.TPS = totalTXs/costTime;
      result.TPS = Math.round(result.TPS*1000)/1000;
      result.meanDayRewards = 0.3375*docs[0].number/((docs[0].timestamp-firstDayTime)/oneDaySeconds);
      result.meanDayRewards = regDecimal(result.meanDayRewards, 4);
    }

    res.write(JSON.stringify(result));
    res.end();
  });
}

var sendTxs = function(lim, res) {
  Transaction.find({}, "hash timestamp from to value").lean(true).sort('-timestamp').limit(lim)
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
