#!/usr/bin/env node
var mongoose = require( 'mongoose' );
var Address = mongoose.model('Address');
var pageSize = 20;
var page = 0;
var totalPage = 0;
var resultData={"totalPage":0, "list":null, "page":0};


function requestParam(req, param){
  if(req.method == "GET"){
      return req.query[param];
  }else{
      return req.body[param];
  }
}

module.exports = function(req, res){
  try{
    var quereyParam = {};
    var addressType = parseInt(requestParam(req, "addressType"));
    if(isNaN(addressType))
      addressType=-1;
    if(addressType>0)
      quereyParam.type = addressType;
    else
      quereyParam.type = {$nin:[1,2]};
  
    page = parseInt(requestParam(req, "page"));
    if(isNaN(page) || page<0)
      page = 0;
  
    totalPage = parseInt(requestParam(req, "totalPage"));
    if(isNaN(totalPage) || totalPage<0)
      totalPage = 0;
    
    resultData.totalPage = totalPage;
    resultData.page = page;
    resultData.list = null;

    if(resultData.totalPage == 0){
      Address.count(quereyParam).exec(function(err,c){
        if(err){
          console.log("Address err: ", err);
          res.write(JSON.stringify(resultData));
          res.end();
          return;
        }
        resultData.totalPage = Math.ceil(c/pageSize);
        if(page>=resultData.totalPage){
          resultData.page = 0;
          page=0;
        }
        getList(res, quereyParam);
      });
    }else{
      getList(res, quereyParam);
    }
  } catch (e) {
    console.error(e);
    res.write(JSON.stringify(resultData));
    res.end();
  }
}; 

function getList(res, quereyParam){
  AddressFind = Address.find(quereyParam, "-_id addr type balance").sort({"balance":-1}).skip(page*pageSize).limit(pageSize).lean(true);
  AddressFind.exec(function (err, docs) {
    if(err){
      console.log("Address err: ", err);
      res.write(JSON.stringify(resultData));
      res.end();
      return;
    }
    resultData.list=docs;
    res.write(JSON.stringify(resultData));
    res.end();
  });
}