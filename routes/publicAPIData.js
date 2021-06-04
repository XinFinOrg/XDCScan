#!/usr/bin/env node
var eth = require("./web3relay").eth;
var filterBlocks = require('./filters').filterBlocks;
var witnessListData = require('./witnessListData');

var totalXDC = "totalXDC";

var getcirculatingsupply = "getcirculatingsupply";

var balance = "balance";
var balancemulti = "balancemulti";

var txlist = "txlist";
var txlistinternal = "txlistinternal";
var getminedblocks = "getminedblocks";

var getabi = "getabi";
var getsourcecode = "getsourcecode";

var getstatus = "getstatus";
var gettxreceiptstatus = "gettxreceiptstatus";
var gettxdetails = "gettxdetails";

var getblockreward = "getblockreward";

var getLogs = "getLogs";

var masterNodeVer = "masterNodeVer";
var masternodeList = "masternodeList";

var eth_blockNumber = "eth_blockNumber";
var eth_getBlockByNumber = "eth_getBlockByNumber";
var eth_getBlockTransactionCountByNumber = "eth_getBlockTransactionCountByNumber";
var eth_getTransactionByHash = "eth_getTransactionByHash";
var eth_getTransactionByBlockNumberAndIndex = "eth_getTransactionByBlockNumberAndIndex";
var eth_getTransactionCount = "eth_getTransactionCount";
var eth_sendRawTransaction = "eth_sendSignedTransaction";
var eth_getTransactionReceipt = "eth_getTransactionReceipt";
var eth_call = "eth_call";
var eth_getCode = "eth_getCode";
var eth_getStorageAt  = "eth_getStorageAt ";
var eth_gasPrice = "eth_gasPrice";
var eth_estimateGas = "eth_estimateGas";

var tokensupply = "tokensupply";

var mongoose = require( 'mongoose' );
var Block = mongoose.model('Block');
var Transaction = mongoose.model('Transaction');
var Contract = mongoose.model('Contract');
var LogEvent = mongoose.model('LogEvent');

var requestParam = function(req, param){
  var p = req.query[param];
  if(!p){//try post method
    p = req.body[param];
  }
  return p;
}

module.exports = async function(req, res){
  var respData = {"status":1,"message":"OK","result":""};
    try{
      totalBlockNum = await eth.getBlockNumber();
      methodName = req.query.methodName;
      if(!methodName)
        methodName = req.query.action;
      
      switch(methodName){
        case totalXDC:
          onlyValue = requestParam(req, "onlyValue");
          value = (37500000000+5.55*totalBlockNum).toFixed();
          if(onlyValue){
            res.write(String(value));
            res.end();
          }else{
            sendData(res, respData, value);
          }
          break;
          case getcirculatingsupply:
          onlyValue = requestParam(req, "onlyValue");
          value = (12100000000+5.55*totalBlockNum).toFixed();
          if(onlyValue){
            res.write(String(value));
            res.end();
          }else{
            sendData(res, respData, value);
          }
          break;
        case balance:
          address = requestParam(req, "address");
          sendData(res, respData, await eth.getBalance(address));
          break;
        case balancemulti:
          addresses = requestParam(req, "address");
          addresses = addresses.split(",");
          if(addresses.length>20)
            addresses.length = 20;
          var arr = [];
          for(var i=0; i<addresses.length; i++){
            balanceObj = {"account":addresses[i],"balance":0};
            balanceObj.balance = await eth.getBalance(addresses[i]);
            arr.push(balanceObj);
          }
          sendData(res, respData, arr);
          break;
        case txlist:
          address = requestParam(req, "address");
          var pageSize = Number(requestParam(req, "pageSize"));
          var transactionPage = requestParam(req, "page");
          if(pageSize>100)
            pageSize = 100;
          if(transactionPage<0)
            transactionPage = 0;
          transactionFind = Transaction.find({$or: [{"from": address}, {"to": address}]}).sort({"timestamp":-1}).skip(transactionPage*pageSize).limit(pageSize).lean(true);
          transactionFind.exec(function (err, docs) {
            if(err)
              responseFail(res, respData, err.toString());
            else{
              sendData(res, respData, docs);
            }
          });
          break;
        case txlistinternal:
          address = requestParam(req, "address");
          var transactionPage = requestParam(req, "page");
          var pageSize = Number(requestParam(req, "pageSize"));
          if(pageSize>100)
            pageSize = 100;
          if(transactionPage<0)
            transactionPage = 0;
          transactionFind = Transaction.find({$or: [{"from": address}, {"to": address}], input:{$ne:"0x"}}).skip(transactionPage*pageSize).limit(pageSize).lean(true);
          transactionFind.exec(function (err, docs) {
            if(err)
              responseFail(res, respData, err.toString());
            else{
              sendData(res, respData, docs);
            }
          });
          break;
        case getminedblocks:
          address = requestParam(req, "address");
          var page = requestParam(req, "page");
          var pageSize = Number(requestParam(req, "pageSize"));
          if(pageSize>100)
            pageSize = 100;
          if(page<0)
            page = 0;
            
          var blockFind = Block.findOne( { "miner" : address }).skip(page*pageSize).limit(pageSize).lean(true);
          blockFind.exec(function (err, doc) {
              if (err) {
                responseFail(res, respData, err.toString());
              } else {
                sendData(res, respData, doc);
              }
          });
          break;

        case getabi:
          address = requestParam(req, "address");
          Contract.findOne({'address':address}, "abi").exec(function(err, doc){
            if(err){
              responseFail(res, respData, err.toString());
            }else if(doc==null){
              respData.result = "";
              responseFail(res, respData, "not exist");
            }else{
              sendData(res, respData, doc.abi);
            }
          });
          break;
        case getsourcecode:
          address = requestParam(req, "address");
          Contract.findOne({'address':address}, "sourceCode").exec(function(err, doc){
            if(err){
              responseFail(res, respData, err.toString());
            }else if(doc==null){
              respData.result = "";
              responseFail(res, respData, "not exist");
            }else{
              sendData(res, respData, doc.sourceCode);
            }
          });
          break;
        case getstatus:
          txhash = requestParam(req, "txhash");
          txr = await eth.getTransactionReceipt(txhash);
          if(txr){
            var data;
            if(txr.status == "0x0")
              data = {"isError":"1","errDescription":"Transaction fail"};
            else
              data = {"isError":"0","errDescription":"success"};
            sendData(res, respData, data);
          }else{
            responseFail(res, respData, "not exist");
          }
          break;
        case gettxreceiptstatus:
          txhash = requestParam(req, "txhash");
          txr = await eth.getTransactionReceipt(txhash);
          if(txr){
            var data;
            if(txr.status)
              data = txr;
            else
              data = {"isError":"1"};
            sendData(res, respData, data);
          }else{
            responseFail(res, respData, "not exist");
          }
          break;
        case gettxdetails:
          txhash = requestParam(req, "txhash");
          txr = await eth.getTransaction(txhash);
          if(txr){
            var data = txr;
            sendData(res, respData, data);
          }else{
            responseFail(res, respData, "not exist");
          }
          break;
        case getblockreward:
          blockno = Number(requestParam(req, "blockno"));
          if(isNaN(blockno)){
            respData.result = "";
            responseFail(res, respData, "not exist");
          }else{
            blockData = await eth.getBlock(blockno);
            if(blockData){
              var resultObj = {"blockReward":0.3375, "blockNumber":blockData.number, "timeStamp":blockData.timestamp ,"blockMiner":blockData.miner};
              sendData(res, respData, resultObj);
            }else{
              respData.result = 0;
              responseFail(res, respData, "not exist");
            }
          }
          break;
          case getLogs:
            address = requestParam(req, "address");
            fromBlock = Number(requestParam(req, "fromBlock"));
            toBlock = requestParam(req, "toBlock");
            topics = requestParam(req, "topics");
            data = requestParam(req, "data");
            returnFilters = requestParam(req, "returnFilters");
            findObj = {'address':address};
            if(toBlock){
              if(isNaN(toBlock))
                findObj.blockNumber = {$gte:fromBlock};
              else
                findObj.blockNumber = {$gte:fromBlock, $lte:toBlock};
            }
            if(topics){
              var topicsArr = topics.split(",");
              for(var n=0; n<topicsArr.length; n++){
                topicsArr[n] = topicsArr[n].trim();
                if(topicsArr[n]!="")
                  findObj["topics."+n] = topicsArr[n];
              }
            }
            if(data){
              findObj.data = data;
            }
            if(toBlock == "latest")
              toBlock = totalBlockNum;
            else
              toBlock = Number(toBlock);
            
            var findOP;
            if(returnFilters){
              returnFilters = returnFilters.split(",");
              returnFilters = returnFilters.join(" ");
              findOP = LogEvent.find(findObj, returnFilters);
            }
            else
              findOP = LogEvent.find(findObj);
            
            findOP.exec(function(err, docs){
              if(err){
                responseFail(res, respData, err.toString());
              }else if(docs==null){
                respData.result = "";
                responseFail(res, respData, "no logs");
              }else{
                sendData(res, respData, docs)
              }
            });
            break;

          case eth_blockNumber:
            sendData(res, respData, totalBlockNum);
            break;
          case eth_getBlockByNumber:
            blockNumber = requestParam(req, "blockNumber");
            if(blockNumber == "latest")
              blockNumber = totalBlockNum;
            else
              blockNumber = Number(blockNumber);
            sendData(res, respData, await eth.getBlock(blockNumber));
            break;
          case eth_getBlockTransactionCountByNumber:
            blockNumber = requestParam(req, "blockNumber");
            sendData(res, respData, await eth.getBlockTransactionCount(blockNumber));
            break;
          case eth_getTransactionByHash:
            txhash = requestParam(req, "txhash");
            sendData(res, respData, await eth.getTransaction(txhash));
            break;
          case eth_getTransactionByBlockNumberAndIndex:
            blockNumber = requestParam(req, "blockNumber");
            index = requestParam(req, "index");
            sendData(res, respData, await eth.getTransactionFromBlock(blockNumber, index));
            break;
          case eth_getTransactionCount:
            address = requestParam(req, "address");
            sendData(res, respData, await eth.getTransactionCount(address));
            break;
          case eth_sendRawTransaction:
            hex = requestParam(req, "hex");
            sendData(res, respData, await eth.sendSignedTransaction(hex));
            break;
          case eth_getTransactionReceipt:
            txhash = requestParam(req, "txhash");
            sendData(res, respData, await eth.getTransactionReceipt(txhash));
            break;
          case eth_call:
            to = requestParam(req, "to");
            data = requestParam(req, "data");
            blockNumber = requestParam(req, "blockNumber");
            sendData(res, respData, await eth.call({"to" : to, "data" : data}));
            break;
          case eth_getCode:
            address = requestParam(req, "address");
            blockNumber = requestParam(req, "blockNumber");
            sendData(res, respData, await eth.getCode(address, blockNumber));
            break;
          case eth_getStorageAt:
            address = requestParam(req, "address");
            position = requestParam(req, "position");
            blockNumber = requestParam(req, "blockNumber");
            sendData(res, respData, await eth.getStorageAt(address, position, blockNumber));
            break;
          case eth_gasPrice:
            sendData(res, respData, await eth.gasPrice);
            break;
          case eth_estimateGas:
            var obj = {};
            from = requestParam(req, "from");
            if(from)
              obj.form = from;
            to  = requestParam(req, "to");
            if(to)
              obj.to = to;
            data = requestParam(req, "data");
            if(data)
              obj.data = data;

            sendData(res, respData, await eth.estimateGas(obj));
            break;
          
          case tokensupply:
            contractaddress=requestParam(req, "contractaddress");
            Contract.findOne({'address':contractaddress}, "totalSupply").exec(function(err, doc){
              if(err){
                responseFail(res, respData, err.toString());
              }else if(doc==null){
                respData.result = "";
                responseFail(res, respData, "not exist");
              }else{
                sendData(res, respData, doc.totalSupply);
              }
            });
            break;
            beak;
          case masterNodeVer:
            var blockFind = Block.find( { "timestamp":{$gt:1535731200}}).lean(true);
            blockFind.exec(function (err, docs) {
                if (err) {
                  responseFail(res, respData, err.toString());
                } else {
                  var keys = [];
                  var vers = [];
                  var percent = {};
                  var total = 0;
                  for(var j=0; j< docs.length; j++){
                    var block = docs[j];
                    if(!block.witness)
                      continue;
                    total++;
                    block = filterBlocks(block);
                    var ind = keys.indexOf(block.witness);
                    var ver = block.extraData.charCodeAt(3)+"."+block.extraData.charCodeAt(4)+"."+block.extraData.charCodeAt(5);
                    if(ind==-1){
                      keys.push(block.witness);
                      vers.push(ver);
                    }else{
                      vers[ind] = ver;
                    }
                    if(percent[ver]){
                      percent[ver]++;
                    }else{
                      percent[ver] = 1;
                    }
                  }
                  var respTable = "<table><tr><td>version</td><td>block num</td><td>percent</td></tr>"
                  for(var k in percent){
                    respTable+="<tr><td>"+k+"</td><td>"+percent[k]+"</td><td>"+100*percent[k]/total+"%</td></tr>"
                  }
                  respTable+="<tr><td> </td><td></td><td></td></tr> <tr><td>witness</td><td>version</td><td></td></tr>"
                  for(var n=0; n<keys.length; n++){
                    respTable+="<tr><td>"+keys[n]+"</td><td>"+vers[n]+"</td><td></td></tr>"
                  }
                  respTable+="</table>";
                  // sendData(res, respData, respTable);
                  res.write(respTable);
                  res.end();
                  
                }
            });
            break;

          case masternodeList:
            req.query.listFormat=1;
            req.query.totalPage = 1;
            req.query.page = 0;
            req.query.pageSize = 1000;
            witnessListData(req, res);
            break;
          

      }
      
    } catch (e) {
      responseFail(res, respData, e.toString());
      console.error(e);
    }
}; 

function sendData(res, respData, result){
  respData.result = result;
  res.write(JSON.stringify(respData));
  res.end();
}

function responseFail(res, respData, msg){
  respData.status = 0;
  respData.message = msg;
  res.write(JSON.stringify(respData));
  res.end();
}

module.exports.getTotalXDC = async function(req, res){
  totalBlockNum = await eth.getBlockNumber();
  respData = (37500000000+5.55*totalBlockNum).toFixed(8);
  res.write(String(respData));
  res.end();
}

module.exports.getCirculatingSupply= async function(req, res){
  totalBlockNum = await eth.getBlockNumber();
  respData = (12100000000+5.55*totalBlockNum).toFixed(8);
  res.write(String(respData));
  res.end();
}