require( '../../db.js' );
var mongoose = require('mongoose');
var Address = mongoose.model('Address');

Address.find({}, "balance").sort({"balance":-1}).limit(5000).lean(true).exec(function(err, docs){
    var totalB = 0;
    for(var i=0; i<docs.length; i++){
        totalB += docs[i].balance;
    }
    console.log("totalB:", totalB);
});