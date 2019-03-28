module.exports = function(req, res){
  var respData = "";
  var mongoose = require( 'mongoose' );
  var LogEvent = mongoose.model( 'LogEvent' );

    try{
      logEventFind = LogEvent.find({txHash:req.body.txHash}).lean(true);
      logEventFind.exec(function (err, docs) {
        respData = JSON.stringify(docs);
        res.write(respData);
        res.end();
      });
    } catch (e) {
      console.error(e);
      res.write("[]");
      res.end();
    }

    
  
}; 