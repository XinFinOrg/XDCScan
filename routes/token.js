#!/usr/bin/env node

/*
    Endpoint for client interface with ERC-20 tokens
*/
const getQuote = require("./coinMarketPrice.js").getQuote;
var mongoose = require("mongoose");
var Transaction = mongoose.model("Transaction");
var Contract = mongoose.model("Contract");

var BigNumber = require("bignumber.js");
var etherUnits = require(__lib + "etherUnits.js");

const ERC20ABI = require("../contractTpl/contracts").ERC20ABI;

//token conctract template
var zeroTokenStruct = null;
var ZeroTokenClass = null;

//load token conctract template
function loadAndCompileTokenSol() {
  console.log("load token conctract");
  var fs = require("fs");
  var solFilePath = "./contractTpl/ZeroToken.sol"; //w
  source = fs.readFileSync(solFilePath, "utf8");
  // fs.closeSync(solFilePath);
  let solc = require("solc");
  solc.loadRemoteVersion("soljson-v0.4.21+commit.dfe3193c.js");
  compiledContract = solc.compile(source, 1);
  return compiledContract.contracts["ZeroToken"];
}

//create token conctract
function createZeroTokenInstance() {
  if (zeroTokenStruct == null) {
    var eth = require("./web3relay").eth;
    zeroTokenStruct = loadAndCompileTokenSol();
    let abi = zeroTokenStruct.interface;
    let bytecod = zeroTokenStruct.bytecod;
    let gasEstimate = eth.gasEstimate(bytecod);
    console.log("gaseEstimate:", gasEstimate);
    ZeroTokenClass = eth.contract(JSON.parse(abi));
  }

  console.log("//create token contract");
  let zeroTokenInstance = ZeroTokenClass.new();
  zeroTokenInstance.symbol = "ZT";
  zeroTokenInstance.name = "ZeroToken";
  zeroTokenInstance.decimals = 8;
  zeroTokenInstance._totalSupply = 10000000000; //1000 * 10**uint(decimals);
  zeroTokenInstance.balances[owner] = zeroTokenInstance._totalSupply;
  zeroTokenInstance.Transfer(
    zeroTokenInstance.address(0),
    zeroTokenInstance.owner,
    zeroTokenInstance._totalSupply
  ); //w

  return zeroTokenInstance;
}

/***
 * Author: Luke.Nguyen
 * Company: sotatek
 * Country: Vietnam
 * PhoneNumber: +84 386743836
 *
 * Patch date: 18/05/2021
 *
 * Newly updated for TokenPage
 *
 * This implemented function belows is for getting the info about the Token Contract
 * Also if the Contract is not on the database then proceed to update it if existed
 *
 *
 * **/
async function tokenInfo(address) {
  var contractFind = Contract.findOne({ address: contractAddress }).lean(true);
  contractFind.exec(async function (err, doc) {});

  try {
    const call = await web3.eth.call({
      to: contractAddress,
      data: web3.utils.sha3("totalSupply()"),
    });
    // console.log(contractdb,"contractdb")

    if (call === "0x") {
      isTokenContract = false;
    } else {
      try {
        // ERC20 & ERC223 Token Standard compatible format
        contractdb.tokenName = await Token.methods.name().call();
        contractdb.decimals = await Token.methods.decimals().call();
        contractdb.symbol = await Token.methods.symbol().call();
        contractdb.totalSupply = await Token.methods.totalSupply().call();
        // console.log(contractdb,"contractdb")
      } catch (err) {
        isTokenContract = false;
      }
      // console.log(contractdb,"contractdb")
    }
  } catch (err) {
    isTokenContract = false;
  }
}

module.exports = async function (req, res) {
  // console.log(req.body)
  var contractAddress = req.body.address;
  var fromAccount = req.body.fromAccount;
  var contractAdd = req.body.contractAdd;
  if (!("action" in req.body)) {
    res.status(400).send();
    res.end();
  } else if (req.body.action == "info") {
    try {
      // createZeroTokenInstance();
      var tokenData;
      var contractFind = Contract.findOne({ address: contractAddress }).lean(
        true
      );

      contractFind.exec(async function (err, doc) {
        if (!err && doc) {
          // console.log(doc)

          var dbToken = doc;
          tokenData = {
            balance: dbToken.balance,
            totalSupply: dbToken.totalSupply / 10 ** dbToken.decimals, //dbToken.totalSupply.toEther(actualBalance, 'wei');
            tokenHolders: 2, //tt fix, wait to dev
            name: dbToken.tokenName,
            ERC: dbToken.ERC,
            symbol: dbToken.symbol,
            bytecode: dbToken.byteCode,
            transaction: dbToken.creationTransaction,
            creator: dbToken.owner,
            decimals: dbToken.decimals,
            isVerified: dbToken.sourceCode != null,
            address: contractAddress,
            tokenPrice: 0,
          };

          var mongoose = require("mongoose");
          var Transaction = mongoose.model("Transaction");
          let TokenTransfer = mongoose.model("TokenTransfer");
          let TokenMetadata = mongoose.model("TokenMetadata");
          let TokenHolder = mongoose.model("TokenHolder");
          //TokenHolder.find({"tokenContract": "xdcd18ff933268b05eb7ff6107e9dc169cbf783632c", "balance": {$nin: ["0", 0]}}).count()
          // let tokenHolders = await Transaction.find({ $or: [{ "to": contractAddress }, { "from": contractAddress }], input: { $ne: "0x" } }).distinct("from").count();

          let tokenHoldersCount = await TokenHolder.find({
            tokenContract: { $regex: new RegExp(contractAddress, "i") },
            balance: { $nin: ["0", 0] },
          }).count();

          tokenData.tokenHolders = tokenHoldersCount;

          var eth = require("./web3relay").eth;
          var config = require("./web3relay").config;

          data = await getQuote(tokenData.symbol, config.CMC_API_KEY);

          if (data === null) {
            tokenData.tokenPrice = 0;
          } else {
            tokenData.tokenPrice = data.quoteUSD;
          }

          if (tokenData.ERC === 2) {
            var Token = new eth.Contract(ERC20ABI, contractAddress);
            let totalSupply = await Token.methods.totalSupply().call();
            tokenData.totalSupply = (
              totalSupply /
              10 ** dbToken.decimals
            ).toString();
          }

          let tokenMetadata = await TokenMetadata.findOne({
            address: contractAddress,
          }).lean(true);
          if (tokenMetadata) {
            tokenData.tokenOfficialWebsite = tokenMetadata.officialWebsite;
            tokenData.tokenSocialLinks = tokenMetadata.socialLinks;
          }

          res.write(JSON.stringify(tokenData));
          res.end();
        } else {
          //find from blockChain
          res.write("");
          res.end();
        }
      });
    } catch (e) {
      console.error(e);
      res.write("");
      res.end();
    }
  } else if (req.body.action == "balanceOf") {
    var eth = require("./web3relay").eth;
    var Token = new eth.Contract(ERC20ABI, contractAddress);
    var addr = "0x" + req.body.address.toLowerCase().substring(3);
    console.log(addr, "addr");
    var tokens = 0;
    try {
      tokens = Token.methods
        .balanceOf(addr)
        .call()
        .then(
          (tokens =
            tokens /
            10 **
              Token.methods
                .decimals()
                .call()
                .then(res.write(JSON.stringify({ tokens: tokens })), res.end()))
        );

      // tokens = etherUnits.toEther(tokens, 'wei')*100;
    } catch (e) {
      console.error(e);
    }
  } else if (req.body.action == "create") {
    //create token contract
    res.write("");
    res.end();
  } else if (req.body.action == "contractTransaction") {
    var respData = "";
    try {
      console.log("respone contractTransaction");
      var transactionPage = req.body.transactionPage;
      var mongoose = require("mongoose");
      var Transaction = mongoose.model("Transaction");

      if (transactionPage < 0) transactionPage = 0;
      transactionFind = Transaction.find({ to: req.body.address })
        .skip(transactionPage * 10)
        .limit(10)
        .lean(true);
      transactionFind.exec(function (err, docs) {
        espData = JSON.stringify(docs);
      });
    } catch (e) {
      console.error(e);
    }
    res.write(espData);
    res.end();
  } else if (req.body.action == "tokenTransfer") {
    let addr;
    var respData = "";
    try {
      var page = req.body.page || 0;
      var pageSize = req.body.pageSize || 20;
      var resultData = { totalPage: 0, list: null, page: page };

      var mongoose = require("mongoose");
      var TokenTransfer = mongoose.model("TokenTransfer");
      var findCond;
      if (fromAccount) {
        findCond = {
          contract: req.body.address,
          $or: [{ to: fromAccount }, { from: fromAccount }],
        };
      } else {
        findCond = { contract: req.body.address };
      }

      // fix code
      // findCond = { 'contract': 'xdcd18ff933268b05eb7ff6107e9dc169cbf783632c'};

      TokenTransfer.count(findCond).exec(function (err, c) {
        resultData.recordsFiltered = c;
        resultData.recordsTotal = c;
        resultData.totalPage = Math.ceil(c / pageSize);

        if (page >= resultData.totalPage) {
          resultData.page = 0;
          page = 0;
        }

        tokenTransferFind = TokenTransfer.find(findCond)
          .skip(page * pageSize)
          .limit(pageSize)
          .lean(true);

        tokenTransferFind.exec(function (err, docs) {
          resultData.list = docs;
          respData = JSON.stringify(resultData);
          res.write(respData);
          res.end();
        });
      });
    } catch (e) {
      console.error(e);
    }
  } else if (req.body.action == "tokenHolder") {
    let addr;
    var respData = "";
    try {
      var page = req.body.page || 0;
      var pageSize = req.body.pageSize || 20;
      var resultData = { totalPage: 0, list: null, page: page };

      var mongoose = require("mongoose");
      var TokenHolder = mongoose.model("TokenHolder");
      var findCond;

      // fix code
      findCond = {
        tokenContract: { $regex: new RegExp(req.body.address, "i") },
        balance: { $nin: ["0", 0] },
      };

      TokenHolder.count(findCond).exec(function (err, c) {
        resultData.recordsFiltered = c;
        resultData.recordsTotal = c;
        resultData.totalPage = Math.ceil(c / pageSize);

        if (page >= resultData.totalPage) {
          resultData.page = 0;
          page = 0;
        }

        tokenHolderFind = TokenHolder.find(findCond)
          .sort({ balance: -1 })
          .skip(page * pageSize)
          .limit(pageSize)
          .lean(true);
        tokenHolderFind.exec(function (err, docs) {
          resultData.list = docs;
          respData = JSON.stringify(resultData);
          res.write(respData);
          res.end();
        });
      });
    } catch (e) {
      console.error(e);
    }
  } else {
    res.write("");
    res.end();
  }
};

const MAX_ENTRIES = 50;
