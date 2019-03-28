#!/usr/bin/env node
module.exports = function(req, res){
  var respData = "";
  var mongoose = require( 'mongoose' );
  var TokenTransfer = mongoose.model( 'TokenTransfer' );
  if(req.body.address){//contract's internal transactions
    // try{
    //   tokenTransferFind = TokenTransfer.find({contractAdd:req.body.address}).lean(true);
    //   tokenTransferFind.exec(function (err, docs) {
    //   respData = JSON.stringify(docs);
    //   res.write(respData);
    //   res.end();
    //   });
    // } catch (e) {
    //   console.error(e);
    // }
    var fromAccount = req.body.fromAccount;
    var respData = "";
    try{
      var internalPage = req.body.internalPage;
      var mongoose = require( 'mongoose' );
      var TokenTransfer = mongoose.model( 'TokenTransfer' );
      var findCond;
      if(fromAccount){
        findCond = {contractAdd:req.body.address, $or:[{"to": fromAccount}, {"from": fromAccount}]};
      }else{
        findCond = {contractAdd:req.body.address};
      }
      if(internalPage<0)
        internalPage=0;
      tokenTransferFind = TokenTransfer.find(findCond).skip(internalPage*10).limit(10).lean(true);
      tokenTransferFind.exec(function (err, docs) {
      respData = JSON.stringify(docs);
      res.write(respData);
      res.end();
      });
    } catch (e) {
      console.error(e);
      res.write("[]");
      res.end();
    }
  }else if(req.body.txHash){//transactions detail
    try{
      txHash = req.body.txHash.trim();
      tokenTransferFind = TokenTransfer.find({transactionHash:txHash}).lean(true);
      tokenTransferFind.exec(function (err, docs) {
      respData = JSON.stringify(docs);
      res.write(respData);
      res.end();
      });
    } catch (e) {
      console.error(e);
      res.write("[]");
      res.end();
    }
  }
    
  
}; 