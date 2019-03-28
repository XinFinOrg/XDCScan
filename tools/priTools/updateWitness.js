require( '../../db.js' );
var mongoose = require('mongoose');
var Witness = mongoose.model('Witness');
var Block = mongoose.model('Block');

var witnessList;
Witness.find({}, "-_id,witness").lean(true).exec(function(err, docs){
    witnessList = docs;
    updateOne();
});

function updateOne(){
    if(witnessList.length==0){
        process.exit(0);
        console.log("update witness finish !");
        return;
    }
    witness = witnessList.pop().witness;

    var blockCount = 0;
    Block.count({'witness':witness}).exec(function (err, c) {
        blockCount = c;
        console.log(witness, ": ", blockCount);
        //find block
        Block.find({'witness':witness}).sort('-number').limit(1).exec(function (err, blockDatas) {
            if(err){
                console.log(err);
                process.exit(0);
            }
            if(!blockDatas || blockDatas.length==0){
                updateOne();
                return;
            }
            var blockData = blockDatas[0];
            var reward = 0.3375*blockCount;
            Witness.update({"witness":blockData.witness},
            {$set:{"lastCountTo":blockData.number, "hash":blockData.hash, "miner":blockData.miner, "timestamp":blockData.timestamp, "status":true, "blocksNum":blockCount, "reward":reward}},
            {upsert: false},
            function (err, data) {
                if(err)
                    console.log("err:", err);
                
                setTimeout(updateOne, 200);
            }
            );
        });
    });
 
}