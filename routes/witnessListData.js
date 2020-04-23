#!/usr/bin/env node
var mongoose = require( 'mongoose' );
var Witness = mongoose.model('Witness');
var Block = mongoose.model('Block');
const masterNodeDetails = require('../models/masterNodeDetails');

var resultData={"totalPage":0, "list":null, "page":0};

function requestParam(req, param){
  if(req.method == "GET"){
      return req.query[param];
  }else{
      return req.body[param];
  }
}

module.exports = function(req, res){
  var listFormat = parseInt(requestParam(req, "listFormat"));
  var pageSize = parseInt(requestParam(req, "pageSize"));
  if(!pageSize)
    pageSize = 10;
  if(pageSize>1000)
    pageSize = 1000;

  var page = parseInt(requestParam(req, "page"));
  if(isNaN(page) || page<0)
    page = 0;

  var totalPage = parseInt(requestParam(req, "totalPage"));
  if(isNaN(totalPage) || totalPage<0)
    totalPage = 0;
  
  resultData.totalPage = totalPage;
  resultData.page = page;
  resultData.list = null;

  if(listFormat==2){//migrate to blockListData in future
    masterNodeRewardsDetails.find({}, "number witness timestamp").sort("-number").limit(pageSize).lean(true).exec(function(err, docs){
      var listData = [];
      for(var i=0; i<docs.length; i++){
        listData.push({"block":docs[i].number, "mn_reward":0.3375, "mn_pubkey":docs[i].witness, "timestamp":docs[i].timestamp});
      }
      res.write(JSON.stringify(listData));
      res.end();
    });
  }else{//witnessList relay
    try{
      if(resultData.totalPage == 0){
        Witness.count({}).exec(function(err,c){
          if(err){
            console.log("Witness err: ", err);
            res.write(JSON.stringify(resultData));
            res.end();
            return;
          }
          resultData.totalPage = Math.ceil(c/pageSize);
          if(page>=resultData.totalPage){
            resultData.page = 0;
            page=0;
          }
          getList(res, page, pageSize, listFormat);
        });
      }else{
        getList(res, page, pageSize, listFormat);
      }
    } catch (e) {
      console.error(e);
      res.write(JSON.stringify(resultData));
      res.end();
    }
  }

}; 

function getList(res, page, pageSize, listFormat){
  WitnessFind = masterNodeDetails.find({}).sort("-lastCountTo").skip(page*pageSize).limit(pageSize).lean(true);
  WitnessFind.exec(function (err, docs) {
    if(err){
      console.log("Witness err: ", err);
      res.write(JSON.stringify(resultData));
      res.end();
      return;
    }
    if(listFormat == 1){
      var listData = [];
      var status = "ENABLED";
      for(var i=0; i<docs.length; i++){
        //ttt 
        // if(docs[i].status)
        //   status = "ENABLED";
        // else
        //   status = "DISCONNECT";
        listData.push({"pubkey":docs[i].witness, "nodetype": "Masternode", "status": status});
      }
      res.write(JSON.stringify(listData));
      res.end();
    }else{
      resultData.list=docs;
      res.write(JSON.stringify(resultData));
      res.end();
    }
      
    
  });
}