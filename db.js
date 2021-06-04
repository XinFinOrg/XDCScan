const mongoose = require('mongoose');
let config = require('./config.json')


const { Schema } = mongoose;

const Block = new Schema(
  {
    'number': { type: Number, index: { unique: true } },
    'hash': String,
    'parentHash': String,
    'nonce': String,
    'sha3Uncles': String,
    'logsBloom': String,
    'transactionsRoot': String,
    'stateRoot': String,
    'receiptRoot': String,
    'miner': { type: String, lowercase: true },
    'difficulty': String,
    'totalDifficulty': String,
    'size': Number,
    'extraData': String,
    'gasLimit': Number,
    'gasUsed': Number,
    'timestamp': Number,
    'blockTime': Number,
    'uncles': [String],
  }, { collection: 'Block' },
);
//master node Info
var Witness = new Schema(
    {
        "blocksNum": Number,//mine block count
        "lastCountTo": Number,//block height
        "witness": {type: String, index: {unique: true}},

        "status":Boolean,
        "hash":String,
        "reward":Number,
        "miner":String,
        "timestamp": Number

    });

const Contract = new Schema(
  {
    'address': { type: String, index: { unique: true } },
    'blockNumber': Number,
    'ERC': { type: Number, index: true }, //0:normal contract, 2:ERC20, 3:ERC223
    'creationTransaction': String,
    'contractName': String,
    'tokenName': String,
    'symbol': String,
    'owner': String,
    'decimals': Number,
    'totalSupply': Number,
    'compilerVersion': String,
    'optimization': Boolean,
    'sourceCode': String,
    'abi': String,
    'byteCode': String,
  }, { collection: 'Contract' },
);

const Account = new Schema(
    {
      'address': { type: String, index: { unique: true } },
      'balance': Number,
      'blockNumber': Number,
      'type': { type: Number, default: 0 }, // address: 0x0, contract: 0x1
    }, { collection: 'Account' },
  );

const Transaction = new Schema(
  {
    'hash': { type: String, index: { unique: true }, lowercase: true },
    'nonce': Number,
    'blockHash': String,
    'blockNumber': Number,
    'transactionIndex': Number,
    'status': Number,
    'from': { type: String, lowercase: true },
    'to': { type: String, lowercase: true },
    'creates': { type: String, lowercase: true },
    'value': String,
    'gas': Number,
    'gasUsed': Number,
    'gasPrice': String,
    'timestamp': Number,
    'input': String,
  }, { collection: 'Transaction' },
);

const TokenTransfer = new Schema(
  {
    'hash': { type: String, index: { unique: true }, lowercase: true },
    'blockNumber': Number,
    'method': String,
    'from': { type: String, lowercase: true },
    'to': { type: String, lowercase: true },
    'contract': { type: String, lowercase: true },
    'value': String,
    'timestamp': Number,
  }, { collection: 'TokenTransfer' },
);


const BlockStat = new Schema(
  {
    'number': { type: Number, index: { unique: true } },
    'timestamp': Number,
    'difficulty': String,
    'hashrate': String,
    'txCount': Number,
    'gasUsed': Number,
    'gasLimit': Number,
    'miner': String,
    'blockTime': Number,
    'uncleCount': Number,
  }, { collection: 'BlockStat' },
);
var ActiveAddressesStat = new Schema({
    "blockNumber": String,
    "count": Number
})


const Market = new Schema(
  {
    "symbol": String,
    "timestamp": Number,
    "quoteBTC": Number,
    "quoteEUR": Number,
    "quoteUSD": Number,
    "quoteINR": Number,
    "percent_change_24h": Number,
    "volume_24h":Number
  }, { collection: 'Market' },
);

var LogEvent = new Schema(
    {
        "address": String,
        "txHash": {type: String, index: true},
        "blockNumber": Number,
        "contractAdd": String,//same with address
        "timestamp": Number,
        "methodName": String,
        "eventName": String,
        "from": String,
        "to": String,
        "logIndex": Number,
        "topics": Array,
        "data": String
    });
mongoose.model('LogEvent', LogEvent);

//all address
var Address = new Schema(
    {
        "addr": {type: String, index: {unique: true}},
        "type": {type: Number, index: true},//0:normal 1:contract 2:masternode
        "balance": Number
    });
mongoose.model('Address', Address);
// create indexes
Transaction.index({ blockNumber: -1 });
Transaction.index({ from: 1, blockNumber: -1 });
Transaction.index({ to: 1, blockNumber: -1 });
Transaction.index({ creates: 1, blockNumber: -1 });
Account.index({ balance: -1 });
Account.index({ balance: -1, blockNumber: -1 });
Account.index({ type: -1, balance: -1 });
Block.index({ miner: 1 });
Block.index({ miner: 1, blockNumber: -1 });
Block.index({ hash: 1, number: -1 });
Market.index({ timestamp: -1 });
TokenTransfer.index({ blockNumber: -1 });
TokenTransfer.index({ from: 1, blockNumber: -1 });
TokenTransfer.index({ to: 1, blockNumber: -1 });
TokenTransfer.index({ contract: 1, blockNumber: -1 });
ActiveAddressesStat.index({blockNumber: -1});


mongoose.model('BlockStat', BlockStat);
mongoose.model('Block', Block);
mongoose.model('Account', Account);
mongoose.model('Contract', Contract);
mongoose.model('Transaction', Transaction);
mongoose.model('Market', Market);
mongoose.model('TokenTransfer', TokenTransfer);
mongoose.model('ActiveAddressesStat', ActiveAddressesStat);
mongoose.model('Witness', Witness);
module.exports.BlockStat = mongoose.model('BlockStat');
module.exports.Block = mongoose.model('Block');
module.exports.Contract = mongoose.model('Contract');
module.exports.Transaction = mongoose.model('Transaction');
module.exports.Witness = Witness;
module.exports.LogEvent = mongoose.model('LogEvent');
module.exports.Address = mongoose.model('Address');

module.exports.Account = mongoose.model('Account');
module.exports.Market = mongoose.model('Market');
module.exports.TokenTransfer = mongoose.model('TokenTransfer');
module.exports.ActiveAddressesStat = mongoose.model('ActiveAddressesStat');


mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO_URI || config.MONGO_URI || 'mongodb://localhost/BlockScanDB', {
  useMongoClient: true
  // poolSize: 5,
  // rs_name: 'myReplicaSetName',
  // user: 'explorer',
  // pass: 'yourdbpasscode'
});

// mongoose.set('debug', true);