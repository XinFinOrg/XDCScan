var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

//masternodes details
const MasterNodeDetails = new Schema(
    {
        "blockNumber":Number,
        "blockHash":String,
        "transactionHash":{type:String,index:{unique:true}},
        "owner":String,
        "candidate":String,
        "address":String,
        "event":String
    }
);
// mongoose.model('MasterNodeDetails',MasterNodeDetails);

module.exports = mongoose.model('MasterNodeDetails',MasterNodeDetails);
