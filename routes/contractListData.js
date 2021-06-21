#!/usr/bin/env node
module.exports = function (req, res) {
  var page = req.body.page || 0;
  var pageSize = req.body.pageSize || 10;
  var searchStr = req.body.searchStr || "";
  var resultData = { totalPage: 0, list: null, page: page };
  var respData = "";
  try {
    var ERC_type = req.body.ERC;
    var mongoose = require("mongoose");
    var Contract = mongoose.model("Contract");
    var findCondition;
    if (ERC_type == -1) findCondition = {};
    else findCondition = { ERC: ERC_type };
    Contract.count(findCondition).exec(function (err, c) {
      resultData.recordsFiltered = c;
      resultData.recordsTotal = c;
      resultData.totalPage = Math.ceil(c / pageSize);
      if (page >= resultData.totalPage) {
        resultData.page = 0;
        page = 0;
      }
      if (searchStr) {
        searchStr = searchStr.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
        searchStr = new RegExp(searchStr, "i");
        var searchCondition = {
          $or: [{ symbol: searchStr }, { tokenName: searchStr }],
        };
      } else {
        var searchCondition = {};
      }
      contractFind = Contract.find(
        { $and: [findCondition, searchCondition] },
        "contractName tokenName ERC address"
      )
        .skip(page * pageSize)
        .limit(pageSize)
        .lean(true);
      contractFind.exec(function (err, docs) {
        resultData.list = docs;
        respData = JSON.stringify(resultData);
        res.write(respData);
        res.end();
      });
    });
  } catch (e) {
    console.error(e);
    res.write(JSON.stringify(resultData));
    res.end();
  }
};
