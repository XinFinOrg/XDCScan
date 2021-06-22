db.TokenHolder.find({}).forEach(
  function(e) {
    e.address = e.address.toLowerCase();
    e.tokenContract = e.tokenContract.toLowerCase();
    db.TokenHolder.save(e);
  }
);

db.TokenTransfer.find({}).forEach(
  function(e) {
    e.contract = e.contract.toLowerCase();
    e.from = e.from.toLowerCase();
    e.to = e.to.toLowerCase();
    db.TokenTransfer.save(e);
  }
);

db.Contract.find({}).forEach(
  function(e) {
    e.address = e.address.toLowerCase();
    e.owner = e.owner.toLowerCase();
    db.Contract.save(e);
  }
);

db.Transaction.find({"to": {$exists: true}}).forEach(
  function(e) {
    e.from = e.from.toLowerCase();
    e.to = e.to.toLowerCase();
    db.Transaction.save(e);
  }
);

db.Transaction.find({"creates": {$exists: true}}).forEach(
  function(e) {
    e.from = e.from.toLowerCase();
    e.creates = e.creates.toLowerCase();
    db.Transaction.save(e);
  }
);