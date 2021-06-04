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
const Contract = mongoose.model('Contract');
const TokenTransfer = mongoose.model('TokenTransfer');

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

// Sets address for RPC WEB3 to connect to, usually your node IP address defaults or localhost
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.WSURL));

TokenTransfer.distinct("contract").exec(
    async function(err, doc){
        if (!err && doc){
            
            doc.forEach(value => {
                
                Contract.findOne({"address": value}).exec(
                    
                    async function(err, doc){
                        if(!err && doc){
                            console.log(value);
                            console.log("nothing to do, already have");
                        }else{
                            if(err){
                                console.log("error when trying to retrieve information about the contract");
                            }else{
                                console.log(value);
                                let contractAddress = value;
                                let isTokenContract = true;
                                let isError = false;
                                let erc = 0
                                try {
                                    const Token = new web3.eth.Contract(ERC20ABI, contractAddress);
                                    const call = await web3.eth.call({ to: contractAddress, data: web3.utils.sha3('totalSupply()') });
                                    // console.log(contractdb,"contractdb")
                                    
                                    if (call === '0x') {
                                      isTokenContract = false;
                                    } else {
                                      try {
                                        // ERC20 & ERC223 Token Standard compatible format
                                        tokenName = await Token.methods.name().call();
                                        decimals = await Token.methods.decimals().call();
                                        symbol = await Token.methods.symbol().call();
                                        totalSupply = await Token.methods.totalSupply().call();
                                        
                                      } catch (err) {
                                        isTokenContract = false;
                                        console.log(err);
                                        isError = true;
                                      }
                                      byteCode = await web3.eth.getCode(contractAddress);
                                      if (isTokenContract) {
                                        erc = 2;
                                        // should be erc = 3 or 2
                                        // it depends but for now it is alway 2
                                      } else {
                                        // Normal Contract
                                        erc = 0;
                                      }
                                      if(!isError){
                                        contract = {
                                            "address" : value.toLowerCase(),
                                            "ERC" : erc,
                                            "blockNumber" : 0,
                                            "byteCode" : byteCode,
                                            "creationTransaction" : "",
                                            "decimals" : decimals,
                                            "owner" : "",
                                            "symbol" : symbol,
                                            "tokenName" : tokenName,
                                            "totalSupply" : totalSupply
                                          }
                                        //   console.log(contract)
                                          // Write to db
                                          Contract.update(
                                                { address: contract.address },
                                                { $setOnInsert: contract },
                                                { upsert: false },
                                                (err, data) => {
                                                if (err) {
                                                    console.log(err);
                                                }
                                                else{
                                                    console.log(data)
                                                }
                                        
                                                },
                                            );
                                      }
                                      
                                    }
                                } 
                                catch (err) {
                                    isTokenContract = false;
                                    console.log(err);
                                }


                            }
                        }
                    }

                );
            });
            
        }
        else{
            if(err){
                console.log("error occurs, please take a look at the code when retrive distinct contract from tokentransfer");
            }
            else{
                console.log("Nothing to do");
            }

            process.exit();
        }

    }

);

// async function updateContract(item, config, i, len, j) {

//     const web3 = new Web3(new Web3.providers.WebsocketProvider(config.WSURL));
//     const contract_object = new web3.eth.Contract(ERC20ABI, item.tokenContract);
//     item.tokenName =await contract_object.methods.name().call();
//     item.symbol =await contract_object.methods.symbol().call();
//     item.balance = (await contract_object.methods.balanceOf(item.address).call()).toString();
    
//     TokenHolder.update(
//       { address: item.address, tokenContract: item.tokenContract},
//       { $setOnInsert: item },
//       { upsert: true },
//       (err, data) => {
//         if (err) {
//           console.log(err);
//         }
//         else{
//             console.log(data)
//         }
//         if(i == len-1 && j == 1){
//             process.exit();
//         }
//       },
//     );
// }
  
// const data = TokenTransfer.distinct("contract");


