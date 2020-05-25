#!/usr/bin/env node
var mongoose = require( 'mongoose' );
var Block = mongoose.model('Block');
var Witness = mongoose.model('Witness');
const masterNodeRewardsDetails = require('../models/masterNodeRewardsDetails');
var oneDaySeconds = 86400//24*60*60;//seconds of one day

module.exports = function(req, res){
  var respData = "";
  var action = req.body.action;
  var witness = req.body.witness;

  if(action == "blocks"){
    try{
      var resultData={"blocks":null, "page":0};
      var page = req.body.page;
      if(isNaN(page) || Number(page)<0)
        page = 0;
      resultData.page = page;
      var pageSize = 10;
      //find witness block
      var blockFind = Block.find({'witness':witness}, "number timestamp gasUsed hash miner").sort('-number').skip(page*pageSize).limit(pageSize).lean(true);
      blockFind.exec(function (err, docs) {
          if(err) 
            resultData.blocks=[];
          else
            resultData.blocks=docs;
          respData = JSON.stringify(resultData);
          res.write(respData);
          res.end(); 
        });      
    } catch (e) {
      console.error(e);
      res.write('{}');
      res.end();
    }

  }else if(action == "metadata"){//witness metadata
    masterNodeRewardsDetails.findOne({'candidate':witness}, "-_id reward blocksNum").lean(true).exec(function (err, doc) {
      var resultData={"reward":0, "totalBlocks":0};
      if(err){
        console.log("err:", err);
      }
      if(doc){
        resultData.reward = doc.reward;
        resultData.totalBlocks = doc.blocksNum;
      }
      res.write(JSON.stringify(resultData));
      res.end();
    })
      // var resultData={"reward":0, "totalBlocks":0};
      //read witness history data
      // var witnessDoc;
      // Witness.findOne({'witness':witness}).lean(true).exec(function (err, _witnessDoc) {
      //   witnessDoc = _witnessDoc;
      //   if(witnessDoc==null){
      //     witnessDoc = {
      //       "blocksNum": 0,
      //       "lastCountTo": 0,
      //       "witness": witness
      //     }
      //   }
      //   //count new block with witness
      //   Block.count({'witness':witness, 'number':{$gt:witnessDoc.lastCountTo}}).exec(function(err,c){
      //     if(err){
      //       //console.log("查询"+witness+"大于"+witnessDoc.lastCountTo+"的区块失败："+err);
      //       res.write("{}");
      //       res.end();
      //       return
      //     }
      //     if(c==0){
      //       resultData.totalBlocks = witnessDoc.blocksNum;
      //       resultData.reward = 0.3375*witnessDoc.blocksNum;
      //       respData = JSON.stringify(resultData);
      //       res.write(respData);
      //       res.end();
      //     }else{//need update witness db
      //       //read latest block number with witness
      //       Block.findOne({'witness':witness}).sort('-number').exec(function (err, doc) {
      //         if(doc){
      //           //console.log(witness+"的最新number:"+doc.number);
      //           witnessDoc.lastCountTo = doc.number;
      //           witnessDoc.blocksNum += c;
      //         }
      //         resultData.totalBlocks = witnessDoc.blocksNum;
      //         resultData.reward = 0.3375*witnessDoc.blocksNum;
      //         respData = JSON.stringify(resultData);
      //         res.write(respData);
      //         res.end();
      
      //         //update witness info in db
      //         if(_witnessDoc == null){//insert witnessDoc
      //           Witness.update(
      //             {'witness': witness}, 
      //             {$setOnInsert: witnessDoc}, 
      //             {upsert: true},  
      //             function (err, data) {
      //                 if(err)
      //                     console.log(err);
      //             }
      //           );
      //         }else{//update witnessDoc
      //           Witness.update(
      //             {'witness': witness}, 
      //             // {$setOnInsert: witnessDoc}, 
      //             // {upsert: true}, 
      //             {$set:{'lastCountTo':witnessDoc.lastCountTo, 'blocksNum':witnessDoc.blocksNum}}, 
      //             {multi: false, upsert: false}, 
      //             function (err, data) {
      //                 if(err)
      //                     console.log(err);
      //             }
      //           );
      //         }
      //       });//end block.findOne
      //     }
      //   });
      // });


    }else if(action == "historyCount"){
      var dayBefore = Number(req.body.dayBefore);//day before today
      var nowDate = new Date();
      var todaySeconds = nowDate.getHours()*3600+nowDate.getMinutes()*60+nowDate.getSeconds();
      var fromDayTime = parseInt(nowDate.getTime()/1000)-todaySeconds - oneDaySeconds*dayBefore;
      //Block.find({'witness':witness, 'timestamp':{$gt:fromDayTime}}, "timestamp -_id").sort('timestamp').exec(function (err, docs) {
        Block.find({'witness':witness, 'timestamp':{$gt:fromDayTime}}, "timestamp -_id").exec(function (err, docs) {
          if(err){
            console.log("witness err:",err);
          }else{
            var weekMeanRewards=0;
            if(docs){
              weekMeanRewards = 0.3375*docs.length/(dayBefore+1)
            }
            respData = JSON.stringify({'fromDayTime':fromDayTime, 'docs':docs, 'weekMeanRewards':weekMeanRewards});
            res.write(respData);
          }
          res.end();
      });
    }
  }