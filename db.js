var mongoose = require( 'mongoose' );
let config = require('./config.json')

var Schema   = mongoose.Schema;

var Block = new Schema(
{
    "number": {type: Number, index: {unique: true}},
    "hash": String,
    "parentHash": String,
    "nonce": String,
    "sha3Uncles": String,
    "logsBloom": String,
    "transactionsRoot": String,
    "stateRoot": String,
    "receiptRoot": String,
    "miner": {type: String, lowercase: true},
    "difficulty": String,
    "totalDifficulty": String,
    "size": Number,
    "extraData": String,
    "gasLimit": Number,
    "gasUsed": Number,
    "timestamp": Number,
    "blockTime": Number,
    "txs": [String],//same with transactions
});
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

var Contract = new Schema(
{
    "address": {type: String, index: {unique: true}},
    "blockNumber": Number,
    "ERC":{type: Number, index: true},//0:normal contract 2:ERC20, 3:ERC223
    "creationTransaction": String,
    "contractName": String,
    "tokenName": String,
    "symbol": String,
    "owner": String,
    "decimals": Number,
    "totalSupply": Number,
    "balance": Number,
    "compilerVersion": String,
    "optimization": Boolean,
    "sourceCode": String,
    "abi": String,
    "byteCode": String
}, {collection: "Contract"});

var Account = new Schema(
    {
        "address": {type: String, index: {unique: true}},
        "balance": Number,
        "blockNumber": Number,
        "type": Number // address: 0x0, contract: 0x1
    });
var Transaction = new Schema(
{
    "hash": {type: String, index: {unique: true}, lowercase: true},
    "nonce": Number,
    "blockHash": String,
    "blockNumber": {type: Number, index: true},
    "transactionIndex": Number,
    "status":Number,
    "from": {type: String, lowercase: true},
    "to": {type: String, lowercase: true},
    "creates": {type: String, lowercase: true},
    "value": String,
    "gas": Number,
    "gasUsed": Number,
    "contractAddress":String,
    "gasPrice": String,
    "timestamp": Number,
    "input": String,
    "status": Number
}, {collection: "Transaction"});


var TokenTransfer = new Schema(
    {
        "transactionHash": {type: String, index: {unique: true}},
        "blockNumber": Number,
        "methodName": String,
        "amount": Number,
        "contractAdd": String,
        "to": String,
        "from": String,
        "timestamp": Number
    });
    mongoose.model('TokenTransfer', TokenTransfer);
    var TokenTransferClass = mongoose.model('TokenTransfer');

var BlockStat = new Schema(
{
    "number": {type: Number, index: {unique: true}},
    "timestamp": Number,
    "difficulty": String,
    "hashrate": String,
    "txCount": Number,
    "gasUsed": Number,
    "gasLimit": Number,
    "miner": String,
    "blockTime": Number,
    "uncleCount": Number
});

var Market = new Schema({
    "symbol": String,
    "timestamp": Number,
    "quoteBTC": Number,
    "quoteUSD": Number,
    "percent_change_24h": Number
})

var ActiveAddressesStat = new Schema({
    "blockNumber": String,
    "count": Number
})

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
Transaction.index({timestamp: -1});
Transaction.index({blockNumber: -1});
Transaction.index({from: 1, blockNumber: -1});
Transaction.index({to: 1, blockNumber: -1});
Transaction.index({creates: 1, blockNumber: -1});
Account.index({balance: -1});
Account.index({balance: -1, blockNumber: -1});
Block.index({miner: -1});
Block.index({hash: -1});
Block.index({number: -1});
Market.index({timestamp: -1})
ActiveAddressesStat.index({blockNumber: -1});
BlockStat.index({timestamp: 1});
BlockStat.index({number: -1});

mongoose.model('BlockStat', BlockStat);
mongoose.model('Block', Block);
mongoose.model('Account', Account);
mongoose.model('Contract', Contract);
mongoose.model('Transaction', Transaction);
mongoose.model('Market', Market);
mongoose.model('ActiveAddressesStat', ActiveAddressesStat);
mongoose.model('Witness', Witness);
module.exports.BlockStat = mongoose.model('BlockStat');
module.exports.Block = mongoose.model('Block');
module.exports.Contract = mongoose.model('Contract');
module.exports.Transaction = mongoose.model('Transaction');
module.exports.TokenTransfer = TokenTransferClass;
module.exports.Witness = Witness;
module.exports.LogEvent = mongoose.model('LogEvent');
module.exports.Address = mongoose.model('Address');

module.exports.Account = mongoose.model('Account');
module.exports.Market = mongoose.model('Market');
module.exports.ActiveAddressesStat = mongoose.model('ActiveAddressesStat');

mongoose.connect( process.env.MONGO_URI || config.MONGO_URI || 'mongodb://localhost/BlockScanDB' );
mongoose.set('debug', false);
