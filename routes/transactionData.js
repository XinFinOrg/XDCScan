#!/usr/bin/env node
var etherUnits = require("../lib/etherUnits.js");
var BigNumber = require('bignumber.js');
var web3relay = require('./web3relay');

const transferMethodFlag = "0xa9059cbb000000000000000000000000";
const waiting = "wait for browser grabbing";
module.exports = async function(req, res){
  var respData = "";
    try{
      //console.log("respone tokenlist");
      var mongoose = require( 'mongoose' );
      var Transaction = mongoose.model('Transaction');
      var isTransfer = false;//req.body.isTransfer;
      var action = req.body.action;
      var address = req.body.address;
      var transactionFind;
      if(action=="internalTX"){
        var internalPage = req.body.internalPage;
        if(internalPage<0)
        internalPage = 0;
        transactionFind = Transaction.find({$or: [{"to": address}, {"from": address}], input:{$ne:"0x"}}).skip(internalPage*10).limit(10).lean(true);
        transactionFind.exec(function (err, docs) {
        espData = JSON.stringify(docs);
        res.write(espData);
        res.end();
        });

      }else if(action=="allTX"){
        var transactionPage = req.body.transactionPage;
        if(transactionPage<0)
          transactionPage = 0;
        transactionFind = Transaction.find({$or: [{"to": address}, {"from": address}]}).skip(transactionPage*10).limit(10).lean(true);
        transactionFind.exec(function (err, docs) {
        espData = JSON.stringify(docs);
        res.write(espData);
        res.end();
        });
      } else if (action == "countTX") {
          let tokenTransfrs = await Transaction.aggregate([
              { $match: { $or: [{ "to": address }, { "from": address }], input: { $ne: "0x" } } },
              {
                  "$lookup": {
                      "from": "TokenTransfer",
                      "localField": "blockNumber",
                      "foreignField": "blockNumber",
                      "as": "resultingTransferArray"
                  }
              },
              { "$unwind": "$resultingTransferArray" },
          ]);
          let transfer = 0;
          for (let itm of tokenTransfrs) {
              if (itm.resultingTransferArray && itm.resultingTransferArray.value) {
                  let temp = etherUnits.toEther(new BigNumber(itm.resultingTransferArray.value), "wei");
                  transfer += Number(temp);
              }
          }
          espData = JSON.stringify({transfervalue:transfer});
          res.write(espData);
          res.end();
      }else{//some tx
        var txHash = req.body.tx;
        if(txHash && txHash.indexOf('0x')!=0)
          txHash = '0x'+txHash;
        //check TX exist in node
        /*
        var txData = web3relay.getTX(txHash);
        if(txData==null){
          res.write("{}");
          res.end();
          return;
        }
        */

        TransactionFind = Transaction.findOne({hash:txHash}).lean(true);
        TransactionFind.exec(function (err, doc) {
          if(err){
            res.write("{}");
            res.end();
            return;
          }
          if(!doc){//if no result in db , get from web3
            var txData = web3relay.getTX(txHash);
            if(txData==null){
              res.write("{}");
              res.end();
              return;
            }
            txData.value = txData.value/(10**18)//etherUnits.toEther(new BigNumber(txData.value), 'wei');//
            var blockData = web3relay.getBlock(txData.blockNumber);
            if(blockData){
              txData.timestamp = blockData.timestamp;
              txData.witness = blockData.witness;
            }
            txData.gasUsed = waiting;
            res.write(JSON.stringify(txData));
            res.end();
            return;
          }
          
          var isToken = false;
          var isContract = false;
          
          //is token and verified
          var contractAddr = doc.to;
          if(!doc.to){
            contractAddr = doc.contractAddress;
          }
          doc.contractAddr = contractAddr;
          var contractLable="";
          var tokenName="";
          var contractLink = "";

          if(doc.to==null){
            doc.createContract = contractAddr;
          }
          if(doc.input && doc.input.length>2){//contract token
            isContract = true;
            if(doc.input.length>=138 && doc.input.substr(0,34)==transferMethodFlag){//is transfer method
              doc.transerTo = "0x"+doc.input.substr(34,40);
              var tokenNum = doc.input.substr(74,64);
              tokenNum = web3relay.web3.toDecimal("0x"+tokenNum);
              doc.tokenNum = tokenNum;
              doc.isTransfer=true;
            }
            var Contract = mongoose.model('Contract');
            ContractFind = Contract.findOne({address:contractAddr}).lean(true);
            ContractFind.exec(function (contractErr, result) {
              if(contractErr){
                console.log(contractErr);
              }else if(result){
                if(result.ERC == 0){//normal contract
                  contractLink = "contract/"+contractAddr;
                }else{
                  isToken = true;
                  doc.tokenNum = doc.tokenNum/10**result.decimals;
                  contractLink = "token/"+contractAddr;
                  if(result.ERC == 2){
                    doc.ERC = "ERC20";
                  }else if(result.ERC == 3){
                    doc.ERC = "ERC223";
                  }else{
                    doc.ERC = "ERC";
                  }
                } 
                tokenName = result.tokenName;  
                if(!doc.to){//contract token creation
                  if(isToken)
                    contractLable = "Token Creation";
                  else
                    contractLable = "Contract Creation"; 
                }else{
                  if(isToken){//token transaction
                    contractLable = "Token Transaction";
                  }else{//normal contract transaction
                    contractLable = "Contract Transaction";
                  }
                }        
              }else{
                contractLable = "Contract";//need verify
                tokenName = contractAddr;
                contractLink = "addr/"+contractAddr;
                doc.needVerify = true;
              }
              doc.tokenName = tokenName;
              doc.contractLable = contractLable;
              doc.contractLink = contractLink;
              
              respData = JSON.stringify(doc);
              res.write(respData);
              res.end();
            });
          }else{//normal transaction
            doc.tokenName = tokenName;
            doc.contractLable = contractLable;
            doc.contractLink = contractLink;
            respData = JSON.stringify(doc);
            res.write(respData);
            res.end();
          }
        });
      }
      
    } catch (e) {
      console.error(e);
      res.write("{}");
      res.end();
    }
}; 