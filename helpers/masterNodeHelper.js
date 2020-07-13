'use strict';
const masterNodeDetails = require('../models/masterNodeDetails');
const masterNodeRewardsDetails = require('../models/masterNodeRewardsDetails');
const contracts = require('../contractTpl/contracts.js');
var config = require('../config.json');
const Xdc3Latest = require("xdc3");
const xdc3Latest = new Xdc3Latest(new Xdc3Latest.providers.WebsocketProvider(config.wss));
var xdc3LatestRelay = require('../routes/xdc3LatestRelay');
const web3relay = require('../routes/web3relay');
var masterNodeContract;
var contractAddress = "0x0000000000000000000000000000000000000088";
const rewardsPerEpoch = 4500;
const epochInterval = 900;
const axiosHelper = require('./axiosHelper');

module.exports = {

    saveData: async function (reqData) {
        try {
            let blockHash, transactionHash, blockNumber, owner, candidate, address, event, masterNodeDetailsFind, array;
            address = reqData.address;
            blockHash = reqData.blockHash;
            transactionHash = reqData.transactionHash;
            blockNumber = reqData.blockNumber;
            owner = reqData.returnValues._owner;
            candidate = reqData.returnValues._candidate;
            event = reqData.event;
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
            }
        }
        catch (error) {
            console.log('saveData_error', error);
            return 'error';
        }
    },

    startWatch: async function () {
        let blockData = await masterNodeDetails.find().sort({ blockNumber: -1 }).limit(1);
        let startBlock;
        if (blockData != null && blockData != '') {
            startBlock = blockData[0].blockNumber - 1000;
        }
        else {
            startBlock = 0;
        }
        const self = this;
        masterNodeContract = new xdc3Latest.eth.Contract(contracts.masterNodeABI, contractAddress);
        masterNodeContract.events.Propose({
            fromBlock: startBlock
        }, function (error, events) { console.log('event', events, error) })
            .on('data', async function (data) {
                self.saveData(data);
            });
    },

    startEpochWatch: async function () {
        try {
            const self = this;
            let subscription = xdc3Latest.eth.subscribe('newBlockHeaders', function (error, result) {
                if (!error) {
                    self.processBlock(result.number);
                }
                else {
                    console.log('blockSubscription_error', error);
                }
            });
        }
        catch (error) {
            console.log('startEpochWatch_error', error);
            return 'error';
        }
    },

    processBlock: async function (blockNumber) {
        try {
            if (blockNumber % epochInterval == 0) {
                const currentEpoch = blockNumber / epochInterval;
                console.log('New Epoch ' + currentEpoch + ' Reached.');
                let processedEpoch, i, epochBlockNumber, candidatesData, totalCandidates, rewardsPerCandidate, candidate, owner, j, array, stakeAmount, rewardsExist, contractOBJ;
                const processedEpochData = await masterNodeRewardsDetails.find().sort({ epochNumber: -1 }).limit(1);
                if (processedEpochData != '' && processedEpochData != null) {
                    processedEpoch = processedEpochData[0].epochNumber;
                }
                else {
                    processedEpoch = 1;
                }
                for (i = processedEpoch; i <= currentEpoch; i++) {
                    epochBlockNumber = epochInterval * i;
                    candidatesData = await this.getCandidatesByBlock(epochBlockNumber);
                    if (candidatesData != '' && candidatesData != '' && candidatesData != 'error') {
                        totalCandidates = candidatesData.length;
                        rewardsPerCandidate = parseFloat(rewardsPerEpoch / totalCandidates).toFixed(18);
                        for (j = 0; j < totalCandidates; j++) {
                            masterNodeContract = new web3relay.eth.Contract(contracts.masterNodeABI, contractAddress);
                            rewardsExist = '';
                            candidate = '0x' + candidatesData[j].substring(3, candidatesData[j].length);
                            stakeAmount = await masterNodeContract.methods.getCandidateCap(candidate).call();
                            owner = await masterNodeContract.methods.getCandidateOwner(candidate).call();
                            candidate = 'xdc' + candidate.substring(2, candidate.length);
                            owner = 'xdc' + owner.substring(2, owner.length);
                            stakeAmount = stakeAmount / (10 ** 18);
                            array = {
                                epochNumber: i,
                                blockNumber: epochBlockNumber,
                                candidate: candidate,
                                owner: owner,
                                rewards: rewardsPerCandidate,
                                stakeAmount: stakeAmount
                            };
                            // rewardsExist = await masterNodeRewardsDetails.findOne({ epochNumber: i, blockNumber: blockNumber, candidate: candidate, owner: owner, rewards: rewardsPerCandidate });
                            rewardsExist = await masterNodeRewardsDetails.findOne(array);
                            if (!(rewardsExist != '' && rewardsExist != null && rewardsExist != 'error')) {
                                array.createdAt = new Date();
                                await masterNodeRewardsDetails.create(array);
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            console.log('processBlock_error', error);
            return 'error';
        }
    },

    getCandidatesByBlock: async function (blockNumber) {
        try {
            const hexBlockNumber = '0x' + blockNumber.toString(16);
            let url = 'https://rpc.xinfin.network/getBlockSignersByNumber';
            let config = {
                "url": url,
                "contentType": "application/json",
                "data": {
                    "jsonrpc": "2.0",
                    "method": "eth_getBlockSignersByNumber",
                    "params": [hexBlockNumber],
                    "id": 1
                }
            };
            let candidatesData = await axiosHelper.makePOSTRequest(config);
            return candidatesData.data.result;
        }
        catch (error) {
            console.log('getCandidatedByBlock_error', error);
            return 'error';
        }
    },

};