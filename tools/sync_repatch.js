/*
Name: Ethereum Blockchain syncer
Version: .0.0.2
This file will start syncing the blockchain from the node address you provide in the conf.json file.
Please read the README in the root directory that explains the parameters of this code
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
const TokenHolder = mongoose.model('TokenHolder');


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
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.WSURL));

const normalizeTX = async (txData, receipt, blockData) => {
  const tx = {
    blockHash: txData.blockHash,
    blockNumber: txData.blockNumber,
    from: txData.from.toLowerCase(),
    hash: txData.hash.toLowerCase(),
    value: etherUnits.toEther(new BigNumber(txData.value), 'wei'),
    nonce: txData.nonce,
    r: txData.r,
    s: txData.s,
    v: txData.v,
    gas: txData.gas,
    gasUsed: receipt.gasUsed,
    gasPrice: String(txData.gasPrice),
    input: txData.input,
    transactionIndex: txData.transactionIndex,
    timestamp: blockData.timestamp,
  };

  if (receipt.status) {
    tx.status = receipt.status;
  }

  if (txData.to) {
    tx.to = txData.to.toLowerCase();
    return tx;
  } else if (txData.creates) {
    tx.creates = txData.creates.toLowerCase();
    return tx;
  } else {
    tx.creates = receipt.contractAddress.toLowerCase();
    return tx;
  }
};


/**
  Break transactions out of blocks and write to DB
**/
const writeTransactionsToDB = async (config, blockData, flush) => {

  const self = writeTransactionsToDB;
  if (!self.bulkOps) {
    self.bulkOps = [];
    self.blocks = 0;
  }
  // save miner addresses
  if (!self.miners) {
    self.miners = [];
  }
  if (blockData) {
    self.miners.push({ address: blockData.miner, blockNumber: blockData.number, type: 0 });
  }
  if (blockData && blockData.transactions.length > 0) {
    for (d in blockData.transactions) {
      const txData = blockData.transactions[d];
      const receipt = await web3.eth.getTransactionReceipt(txData.hash);
      const tx = await normalizeTX(txData, receipt, blockData);
      // Contact creation tx, Event logs of internal transaction
      if (txData.input && txData.input.length > 2) {
        // Contact creation tx
        if (txData.to === null) {
          // Support Parity & Geth case
          if (txData.creates) {
            contractAddress = txData.creates.toLowerCase();
          } else {
            contractAddress = receipt.contractAddress.toLowerCase();
          }
          const contractdb = {};
          let isTokenContract = true;
          const Token = new web3.eth.Contract(ERC20ABI, contractAddress);
          contractdb.owner = txData.from.toLowerCase();
          contractdb.blockNumber = blockData.number;
          contractdb.creationTransaction = txData.hash;
          //console.log(contractdb,"contractdb")

          try {
            const call = await web3.eth.call({ to: contractAddress, data: web3.utils.sha3('totalSupply()') });
            // console.log(contractdb,"contractdb")

            if (call === '0x') {
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
          contractdb.byteCode = await web3.eth.getCode(contractAddress);
          if (isTokenContract) {
            contractdb.ERC = 2;
          } else {
            // Normal Contract
            contractdb.ERC = 0;
          }
          // Write to db
          Contract.update(
            { address: contractAddress },
            { $set: contractdb },
            { upsert: true },
            (err, data) => {
              if (err) {
                console.log(err);
              }
    
            },
          );
        } else {
          //'0xa9059cbb': 'transfer', '0xa978501e': 'transferFrom'
          // Internal transaction  . write to doc of InternalTx
          const transfer = {
            'hash': '', 'blockNumber': 0, 'from': '', 'to': '', 'contract': '', 'value': 0, 'timestamp': 0,
          };
          const methodCode = txData.input.substr(0, 10);
          if (ERC20_METHOD_DIC[methodCode] === 'transfer' || ERC20_METHOD_DIC[methodCode] === 'transferFrom') {
            if (ERC20_METHOD_DIC[methodCode] === 'transfer') {
              // Token transfer transaction
              transfer.from = txData.from.toLowerCase();
              transfer.to = `xdc${txData.input.substring(34, 74).toLowerCase()}`;
              transfer.value = Number(`0x${txData.input.substring(74).toLowerCase()}`);
            } else {
              // transferFrom
              transfer.from = `xdc${txData.input.substring(34, 74).toLowerCase()}`;
              transfer.to = `xdc${txData.input.substring(74, 114).toLowerCase()}`;
              transfer.value = Number(`0x${txData.input.substring(114)}`);
            }
            transfer.method = ERC20_METHOD_DIC[methodCode];
            transfer.hash = txData.hash;
            transfer.blockNumber = blockData.number;
            transfer.contract = txData.to.toLowerCase();
            transfer.timestamp = blockData.timestamp;

            /***
             * Author: Luke.Nguyen
             * Company: sotatek
             * Country: Vietnam
             * PhoneNumber: +84 386743836
             * 
             * Patch date: 04/05/2021
             * 
             * Newly updated code
             * 
             *
             * 
             * 
             * **/

             const insertdata = {

              "tokenName": "",
              "symbol": "",
              "balance": 0
          };
          
          const web3 = new Web3(new Web3.providers.WebsocketProvider(config.WSURL));
          const contract_object = new web3.eth.Contract(ERC20ABI, transfer.contract);
          insertdata.tokenName = await contract_object.methods.name().call();
          insertdata.symbol = await contract_object.methods.symbol().call();
          const balanceFrom = Number(await contract_object.methods.balanceOf(transfer.from).call());
          const balanceTo = Number(await contract_object.methods.balanceOf(transfer.to).call());
          
          // insertdata.tokenContract = transfer.contract.toLowerCase();
          // insertdata.address = transfer.from.toLowerCase();
          insertdata.balance = balanceFrom;

          TokenHolder.update(
            { address: transfer.from.toLowerCase(), tokenContract: transfer.contract.toLowerCase()},
            { $set: insertdata },
            { upsert: true },
            (err, data) => {
              if (err) {
                console.log(err);
              }
              else{
                console.log(data,"upsert token holder from",balanceFrom)
              }
            },
          );

          insertdata.balance = balanceTo;
          TokenHolder.update(
            { address: transfer.to.toLowerCase(), tokenContract: transfer.contract.toLowerCase()},
            { $set: insertdata },
            { upsert: true },
            (err, data) => {
              if (err) {
                console.log(err);
              }
              else{
                console.log(data,"upsert token holder to",balanceTo)
              }
            },
          );

            /***
             * Author: Luke.Nguyen
             * Company: sotatek
             * Country: Vietnam
             * PhoneNumber: +84 386743836
             * 
             * End updating code
             * 
             *
             * 
             * 
             * **/
            // Write transfer transaction into db
            TokenTransfer.update(
              { hash: transfer.hash },
              { $set: transfer },
              { upsert: true },
              (err, data) => {
                if (err) {
                  console.log(err);
                }
                else{
                  console.log(data,"asasas",transfer)
                }
              },
            );
          }
        }
      }
      // if (!(tx.to ==BlockSigners || tx.to ==RandomizeSMC)){
      //   self.bulkOps.push(tx);
      // }
      self.bulkOps.push(tx);
    }
    if (!('quiet' in config && config.quiet === true)) {
      console.log(`\t- block #${blockData.number.toString()}: ${blockData.transactions.length.toString()} transactions recorded.`);
    }
  }
  self.blocks++;

  if (flush && self.blocks > 0 || self.blocks >= config.bulkSize) {
    const bulk = self.bulkOps;
    self.bulkOps = [];
    self.blocks = 0;
    const { miners } = self;
    self.miners = [];

    // setup accounts
    const data = {};
    bulk.forEach((tx) => {
      data[tx.from] = { address: tx.from, blockNumber: tx.blockNumber, type: 0 };
      if (tx.to) {
        data[tx.to] = { address: tx.to, blockNumber: tx.blockNumber, type: 0 };
      }
    });

    // setup miners
    // miners.forEach((miner) => {
    //   data[miner.address] = miner;
    // });

    const accounts = Object.keys(data);

    if (bulk.length === 0 && accounts.length === 0) return;

    // update balances
    if (config.settings.useRichList && accounts.length > 0) {
      asyncL.eachSeries(accounts, (account, eachCallback) => {
        const { blockNumber } = data[account];
        // get contract account type
        web3.eth.getCode(account, (err, code) => {
          if (err) {
            console.log(`ERROR: fail to getCode(${account})`);
            return eachCallback(err);
          }
          if (code.length > 2) {
            data[account].type = 1; // contract type
          }

          web3.eth.getBalance(account, (err, balance) => {
            if (err) {
              console.log(err);
              console.log(`ERROR: fail to getBalance(${account})`);
              return eachCallback(err);
            }

            data[account].balance = parseFloat(web3.utils.fromWei(balance, 'ether'));
            eachCallback();
          });
        });
      }, (err) => {
        let n = 0;
        accounts.forEach((account) => {
          n++;
          if (!('quiet' in config && config.quiet === true)) {
            if (n <= 5) {
              console.log(` - upsert ${account} / balance = ${data[account].balance}`);
            } else if (n === 6) {
              console.log(`   (...) total ${accounts.length} accounts updated.`);
            }
          }
          // upsert account
          Account.collection.update({ address: account }, { $set: data[account] }, { upsert: true });
        });
      });
    }

    if (bulk.length > 0) {
      Transaction.collection.insert(bulk, (err, tx) => {
        if (typeof err !== 'undefined' && err) {
          if (err.code === 11000) {
            if (!('quiet' in config && config.quiet === true)) {
              console.log(`Skip: Duplicate transaction key ${err}`);
            }
          } else {
            console.log(`Error: Aborted due to error on Transaction: ${err}`);
            process.exit(9);
          }
        } else {
          if (!('quiet' in config && config.quiet === true)) {
            console.log(`* ${tx.insertedCount} transactions successfully recorded.`);
          }
        }
      });
    }
  }
};
/**
  //Just listen for latest blocks and sync from the start of the app.
**/
const listenBlocks = function (config) {
  const newBlocks = web3.eth.subscribe('newBlockHeaders', (error, result) => {
    if (!error) {
      return;
    }

    console.error(error);
  });
  newBlocks.on('data', (blockHeader) => {
    web3.eth.getBlock(blockHeader.hash, true, (error, blockData) => {
      if (blockHeader === null) {
        console.log('Warning: null block hash');
      } else {
        writeBlockToDB(config, blockData, true);
        writeTransactionsToDB(config, blockData, true);
      }
    });
  });
  newBlocks.on('error', console.error);``
};

/**
  Block Patcher(experimental)
**/
const runPatcher = async (config, startBlock, endBlock) => {
  if (!web3 || !web3.eth.net.isListening()) {
    console.log('Error: Web3 is not connected. Retrying connection shortly...');
    setTimeout(() => { runPatcher(config, startBlock, endBlock); }, 3000);
    return;
  }


  const missingBlocks = endBlock - startBlock + 1;
  if (missingBlocks > 0) {
    console.log('Patching from #' + startBlock + ' to #' + endBlock);
    if (!('quiet' in config && config.quiet === true)) {
      console.log(`Patching from #${startBlock} to #${endBlock}`);
    }
    let patchBlock = startBlock;
    let count = 0;
    while (count < config.patchBlocks && patchBlock <= endBlock) {
      if (!('quiet' in config && config.quiet === true)) {
        console.log(`Patching Block: ${patchBlock}`);
      }
      web3.eth.getBlock(patchBlock, true, (error, patchData) => {
        if (error) {
          console.log(`Warning: error on getting block with hash/number: ${patchBlock}: ${error}`);
        } else if (patchData === null) {
          console.log(`Warning: null block data received from the block with hash/number: ${patchBlock}`);
        } else {
          checkBlockDBExistsThenWrite(config, patchData);
        }
      });
      patchBlock++;
      count++;
    }
    // flush
    writeTransactionsToDB(config, null, true);

    setTimeout(() => { runPatcher(config, patchBlock, endBlock); }, 1000);
  } else {
    // flush
    writeTransactionsToDB(config, null, true);
    currentBlock = await web3.eth.getBlockNumber();
    setTimeout(function() { runPatcher(config, currentBlock - 1000, currentBlock); }, 600000);
    console.log('*** Block Patching Completed ***');
  }
};
/**
  This will be used for the patcher(experimental)
**/
var checkBlockDBExistsThenWrite = function (config, patchData, flush) {
      writeTransactionsToDB(config, patchData, flush);
};
/**
  Fetch market price from cryptocompare
**/
// 10 minutes
const quoteInterval = 10 * 60 * 1000;


// // patch missing blocks at main net
// if (config.patch === true) {
//   console.log('Checking for missing blocks');
//   runPatcher(config, 30899810, 31499775);
// }
const running = async()=>{
  args = await process.argv;
  console.log(args);
  // patch missing blocks
  if (config.patch === true) {
      console.log('Checking for missing blocks');
      runPatcher(config, parseInt(args[2]), parseInt(args[3]));
    }
  
}

running();