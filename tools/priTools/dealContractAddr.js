require( '../../db.js' );
var mongoose = require('mongoose');
var Address = mongoose.model('Address');
var Contract = mongoose.model('Contract');

var contractAddrs = [];
function getContractAddrs(_cbs){
    Contract.find({}, "address -_id").exec(function(err, docs){
        if(err){
            console.log("getContractAddrs err:",err);
            process.exit(9);
            return;
        }
        for(var i=0; i<docs.length; i++){
            contractAddrs.push(docs[i].address);
        }
        
        console.log("contract len:", docs.length);
        if(_cbs.length>0)
            _cbs.shift()(_cbs);
    })
}

var normalAddr = [];
function getNormalAddr(_cbs){
    Address.find({"type":0}, "addr -_id").lean(true).exec(function(err, docs){
        for(var i=0; i<docs.length; i++){
            normalAddr.push(docs[i].addr);
        }
        console.log("normalAddr len:", normalAddr.length);
        if(_cbs.length>0)
            _cbs.shift()(_cbs);
    });
    // Address.update({addr:{$in:contractAddrs}},{$set:{type:1}});
}
    
function updateAddr(_cbs){
        var addr = normalAddr.pop();
        console.log("less:", normalAddr.length);
        if(contractAddrs.indexOf(addr)>-1){
            Address.update({"addr":addr},{$set:{"type":1}}, function(err, raw){
                console.log("update:",addr);
                if(normalAddr.length>0){
                    setTimeout(updateAddr, 100, _cbs);
                }
                else{
                    console.log("update finish !");
                    process.exit(0);
                }
            });
        }else{
            if(normalAddr.length>0){
                setTimeout(updateAddr, 100, _cbs);
            }
            else{
                console.log("update finish !");
                process.exit(0);
            }
        }
    
}

getContractAddrs([getNormalAddr,updateAddr]);