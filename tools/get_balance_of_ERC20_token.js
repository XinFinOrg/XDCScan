/*
Name: Ethereum Blockchain syncer
Version: 1
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

const Block = mongoose.model('Block');
const Transaction = mongoose.model('Transaction');
const Account = mongoose.model('Account');
const Contract = mongoose.model('Contract');
const TokenTransfer = mongoose.model('TokenTransfer');

const ERC20_METHOD_DIC = { '0xa9059cbb': 'transfer', '0xa978501e': 'transferFrom' };



/**
  Start config for node connection and sync
**/
/**
 * nodeAddr: node address
 * wsPort:  rpc port
 * bulkSize: size of array in block to use bulk operation
 */
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

console.log(`Connecting ${config.nodeAddr}:${config.wsPort}...`);
// Sets address for RPC WEB3 to connect to, usually your node IP address defaults or localhost
// const web3 = new Web3(new Web3.providers.WebsocketProvider(config.WSURL));

// import Web3 from 'web3'; // 1.0.0-beta.55

async function go() {
    const web3 = new Web3(new Web3.providers.WebsocketProvider(config.WSURL));
    const abi = ERC20ABI;
    const address = 'xdcd18fF933268b05Eb7ff6107e9DC169cBF783632c'; 
    const contract = new web3.eth.Contract(abi, address);
    //token_info = web3.eth.contract(web3.toChecksumAddress(contract), abi=ERC20_ABI.ERC20_ABI)
    tokenName = await contract.methods.name().call();
    decimals = await contract.methods.decimals().call();
    symbol = await contract.methods.symbol().call();
    totalSupply = await contract.methods.totalSupply().call();

    console.log(tokenName, symbol, totalSupply);
    const balanceOfTx = await contract.methods.balanceOf('xdcf8902f826c903212aa0bd212fe1dd80606720377').call()
        .then(res => {
            console.log(res);
        });
}

go();

//process.exit(0);