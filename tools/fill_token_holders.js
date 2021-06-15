/*
Name: Ethereum Blockchain syncing token_holders.js
Version: 1

NOTE: Some of the token contract is not ERC20 or has the token value that overflown so that it will have an empty field
such as SYMBOL and token name this defect will be fix soon in future 

*/
require('../db.js');
const BigNumber = require('bignumber.js');
const _ = require('lodash');

const asyncL = require('async');
const Web3 = require('xdc3');

let ERC20ABI = require('../contractTpl/contracts').ERC20ABI

const fetch = require('node-fetch');

const mongoose = require('mongoose');
const etherUnits = require('../lib/etherUnits.js');
const { Market } = require('../db.js');
const { exists } = require('../models/masterNodeRewardsDetails.js');

const Block = mongoose.model('Block');
const Transaction = mongoose.model('Transaction');
const Account = mongoose.model('Account');
const Contract = mongoose.model('Contract');
const TokenTransfer = mongoose.model('TokenTransfer');
const TokenHolder = mongoose.model('TokenHolder');

const ERC20_METHOD_DIC = { '0xa9059cbb': 'transfer', '0xa978501e': 'transferFrom' };


// load config.json
const config = { nodeAddr: 'localhost', wsPort: 8555, bulkSize: 100 };
try {
  var local = require('../config.json');
  _.extend(config, local);
  console.log('config.json found.');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    var local = require('../config.example.json');
    _.extend(config, local);
    console.log('No config file found. Using default configuration... (config.example.json)');
  } else {
    throw error;
    process.exit(1);
  }
}



async function updateTokenHolder(item, config, i, len, j) {

    const web3 = new Web3(new Web3.providers.WebsocketProvider(config.WSURL));
    const contract_object = new web3.eth.Contract(ERC20ABI, item.tokenContract);
    item.tokenName =await contract_object.methods.name().call();
    item.symbol =await contract_object.methods.symbol().call();
    item.balance = (await contract_object.methods.balanceOf(item.address).call()).toString();

    

  
    TokenHolder.update(
      { address: item.address, tokenContract: item.tokenContract},
      { $set: item },
      { upsert: true },
      (err, data) => {
        if (err) {
          console.log(err);
        }
        else{
            console.log(data)
        }
        if(i == len-1 && j == 1){
            process.exit();
        }
      },
    );
}
  
const data = TokenTransfer.find({}, ["contract", "from", "to"]).sort({"timestamp":-1})
data.exec(async function (err, docs) {
    if(err)
      responseFail(res, respData, err.toString());
    else{
        len = docs.length;
        for(var i = 0; i < len; i++){
            var pairs = [
                {
                    "address": docs[i].from.toLowerCase(),
                    "tokenContract": docs[i].contract.toLowerCase(),
                    "tokenName": "",
                    "symbol": "ERR",
                    "balance": "0"
                },
                {
                    "address": docs[i].to.toLowerCase(),
                    "tokenContract": docs[i].contract.toLowerCase(),
                    "tokenName": "",
                    "symbol": "ERR",
                    "balance": "0"
                }
            ];
            for(j = 0; j < 2; j++){
                try{
                    // console.log(pairs[j]);
                    await updateTokenHolder(pairs[j], config, i, len, j);
                    
                }
                catch(err){
                    // {
                    //     "reason": "overflow",
                    //     "code": "NUMERIC_FAULT",
                    //     "fault": "overflow",
                    //     "operation": "toNumber",
                    //     "value": "72199500691656218063434193046843464220897131111428371739808336259477630076942"
                    // }
                    
                    
                    
                    error_output = err;
                    // console.log(error_output);

                    // console.log((error_output["reason"]));
                    // console.log((error_output["value"]));
                    //
                    if((error_output["reason"]) === "overflow" && (error_output["code"]) === "NUMERIC_FAULT" && (error_output["operation"]) === "toNumber"){
                        
                        // const web3 = new Web3(new Web3.providers.WebsocketProvider(config.WSURL));
                        // const contract_object = new web3.eth.Contract(ERC20ABI, pairs[j].tokenContract);
                        // pairs[j].tokenName =await contract_object.methods.name().call();
                        // pairs[j].symbol =await contract_object.methods.symbol().call();
                        console.log("+++");
                        console.log(error_output["value"]);
                        pairs[j].balance = error_output["value"];
                        console.log(pairs[j]);
                        console.log("+++");

                        TokenHolder.update(
                            { address: pairs[j].address, tokenContract: pairs[j].tokenContract},
                            { $set: pairs[j] },
                            { upsert: true },
                            (err, data) => {
                              if (err) {
                                console.log(err);
                                
                              }
                              else{
                                console.log(data)
                              }
                              if(i == len-1 && j == 1){
                                  process.exit();
                              }
                            },
                          );

                    }

                    
                    
                }
                
            }

            
        }
    }
  });
