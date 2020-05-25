var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

//masternodes details
const masterNodeRewardsDetails = new Schema(
    {
        "epochNumber":Number,
        "blockNumber":Number,
        "owner":String,
        "candidate":String,
        "rewards":String,
        "stakeAmount":Number,
        "createdAt":String,
    }
);

module.exports = mongoose.model('masterNodeRewardsDetails',masterNodeRewardsDetails);
