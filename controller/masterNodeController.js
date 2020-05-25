const masterNodeDetails = require('../models/masterNodeDetails');
const masterNodeRewardsDetails = require('../models/masterNodeRewardsDetails');
const contracts = require('../contractTpl/contracts.js');
var config = require('../config.json');
var masterNodeContract;
const web3relay = require('../routes/web3relay');
const Xdc3Latest = require("xdc3");
const xdc3Latest = new Xdc3Latest(new Xdc3Latest.providers.WebsocketProvider(config.wss));
var xdc3latestrelay = require('../routes/xdc3LatestRelay');
var contractAddress = "xdc0000000000000000000000000000000000000088";
var burntAddress = "xdc0000000000000000000000000000000000000000";
let resignMNCount = 9;
let epochRewards = 5000;
let epochInDay = 48;
let burntBalance, totalMasterNodesVal, totalStakedValueVal, mnDailyRewards, totalXDC, cmc_xdc_price;
const masterNodeHelper = require('../helpers/masterNodeHelper');
// const mongoose = require('mongoose');
// const masterNodeDetails = mongoose.model('MasterNodeDetails');

module.exports = {

    list: async function (req, res) {
        try {
            if (!masterNodeContract) {
                let contractOBJ = web3relay.eth.contract(contracts.masterNodeABI);
                masterNodeContract = contractOBJ.at(contractAddress);
            }
            if (masterNodeContract) {
                var data = await masterNodeContract.getCandidates();
                return responseHelper.successWithMessage(res, data);
            }
        }
        catch (error) {
            console.log('list_error', error);
            return responseHelper.serverError(res, error);
        }
    },

    saveMNDetails: async function (req, res) {
        try {
            if (!masterNodeContract) {
                masterNodeContract = new xdc3latestrelay.eth.Contract(contracts.masterNodeABI, contractAddress);
            }
            if (masterNodeContract) {
                let data = await masterNodeContract.getPastEvents('Propose', { fromBlock: 0, toBlock: 'latest' });
                let mnArray = [];
                let array = [];
                let masterNodeDetailsFind = '';
                let blockHash, transactionHash, blockNumber, owner, candidate, address, event, i;
                for (i = 0; i < data.length; i++) {
                    address = 'xdc' + data[i].address.substring(2,data[i].address.length).toLowerCase();
                    blockHash = data[i].blockHash;
                    transactionHash = data[i].transactionHash;
                    blockNumber = data[i].blockNumber;
                    owner = 'xdc' + data[i].returnValues._owner.substring(2,address.length).toLowerCase();
                    candidate = 'xdc' + data[i].returnValues._candidate.substring(2,address.length).toLowerCase();
                    event = data[i].event;
                    masterNodeDetailsFind = '';
                    array = {
                        blockNumber: blockNumber,
                        blockHash: blockHash,
                        transactionHash: transactionHash,
                        owner: owner,
                        candidate: candidate,
                        address: address,
                        event: event
                    };
                    masterNodeDetailsFind = await masterNodeDetails.findOne({ transactionHash: transactionHash });
                    if (!(masterNodeDetailsFind != '' && masterNodeDetailsFind != null && masterNodeDetailsFind != 'error')) {
                        await masterNodeDetails.create(array);
                        mnArray.push(array);
                    }
                }
                return responseHelper.successWithMessage(res, mnArray);
            }
        }
        catch (error) {
            console.log('saveMNDetails_error', error);
            return responseHelper.serverError(res, error);
        }
    },

    updateMNDetails: async function (req, res) {
        try {
            console.log('called');
            masterNodeHelper.startWatch();
            return responseHelper.successWithMessage(res, "Started");
        }
        catch (error) {
            console.log('testMNDetails_error', error);
            return responseHelper.serverError(res, error);
        }
    },

    rewards: async function (req, res) {
        try {
            let address = req.body.address;
            let data;
            if (address == null || address == '') {
                address = '';
                data = await masterNodeRewardsDetails.find();
            }
            else {
                data = await masterNodeRewardsDetails.find({ $or: [{ candidate: address }, { owner: address }] }).sort({ epochNumber: -1 });
            }
            return responseHelper.successWithData(res, "Data fetched", data);
        }
        catch (error) {
            console.log('rewards_error', error);
            return responseHelper.serverError(res, error);
        }
    },

};