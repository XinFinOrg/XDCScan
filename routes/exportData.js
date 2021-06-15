const axios = require("axios");
const json2csv = require('json2csv');
const mongoose = require('mongoose');
const FormData = require('form-data');
const config = require('./config');

const Transaction = mongoose.model('Transaction');
const TokenTransfer = mongoose.model('TokenTransfer');

module.exports = async function(req, res){
  console.log('==============================');
  console.log('API export CSV data');
  console.log('req.body', req.body);
  const gRecaptchaResponse = req.headers['g-recaptcha-response'] || null;
  if (!gRecaptchaResponse) {
    return res.status(400).send({ errorCode: 400, message: 'Error! Invalid captcha response.' });
  }

  const gFormData = new FormData();
  gFormData.append('secret', config.GOOGLE_RECAPTCHA_RESPONSE);
  gFormData.append('response', gRecaptchaResponse);
  const gRecaptchaConfig = {
    method: 'post',
    url: 'https://www.google.com/recaptcha/api/siteverify',
    headers: { 
      ...gFormData.getHeaders()
    },
    data: gFormData,
  };
  const gRecaptchaVerifiedResp = await axios(gRecaptchaConfig);

  if (!gRecaptchaVerifiedResp.data.success) {
    return res.status(400).send({ errorCode: 400, message: 'Error! Invalid captcha response.', description: gRecaptchaVerifiedResp.data['error-codes'] });
  }

  const dtFormat = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
    timeZone: 'UTC',
  });

  const type = req.body.type;
  const startAt = req.body.startDate || null;
  const endAt = req.body.endDate || null;

  if (!startAt || !endAt) {
    return res.status(400).send({ errorCode: 400, message: 'Date filter range is invalid.' });
  }

  let respData;
  let fields;
  let fileName;
  if (type === 'address') {
    const address = req.body.address || null;

    if (!address) {
      return res.status(400).send({ errorCode: 400, message: 'Address is invalid.' });
    }

    const condition = { $or: [ { from: address }, { to: address } ], timestamp: { $gte: startAt, $lte: endAt } };
    const txs = await Transaction.find(condition, { hash: 1, blockNumber: 1, timestamp: 1, from: 1, to: 1, value: 1,  }).limit(5000).lean(true);
    respData = txs.map(tx => {
      return {
        ...tx,
        dateTime: dtFormat.format(tx.timestamp * 1000),
        valueIn: tx.from === address ? 0 : tx.value,
        valueOut: tx.from === address ? tx.value : 0,
      }
    });

    fileName = `${address}.csv`;
    fields = [ { label: 'TxHash', value: 'hash', }, { label: 'Block No', value: 'blockNumber', }, { label: 'Unix Timestamp', value: 'timestamp', }, { label: 'DateTime', value: 'dateTime', }, { label: 'From', value: 'from', }, { label: 'To', value: 'to', }, { label: 'Value In (XDC)', value: 'valueIn', }, { label: 'Value Out (XDC)', value: 'valueOut', } ];
  } else if (type === 'tokentxns') {
    const contract = req.body.contract || null;
    const decimals = req.body.decimals || null;
    const address = req.body.address || null;

    if (!contract) {
      return res.status(400).send({ errorCode: 400, message: 'Contract address is invalid.' });
    }
    if (!decimals) {
      return res.status(400).send({ errorCode: 400, message: 'Contract decimals is invalid.' });
    }

    let condition;
    if (address) {
      condition = { contract: contract, $or: [ { from: address }, { to: address } ], timestamp: { $gte: startAt, $lte: endAt } };
    } else {
      condition = { contract: contract, timestamp: { $gte: startAt, $lte: endAt } };
    }
    const txs = await TokenTransfer.find(condition).limit(5000).lean(true);
    respData = txs.map(tx => {
      return {
        ...tx,
        dateTime: dtFormat.format(tx.timestamp * 1000),
        amount: tx.value / 10 ** decimals,
      }
    });

    fileName = `token-${address}.csv`;
    fields = [ { label: 'TxHash', value: 'hash' }, { label: 'Block No', value: 'blockNumber' }, { label: 'Unix Timestamp', value: 'timestamp' }, { label: 'DateTime', value: 'dateTime' }, { label: 'From', value: 'from' }, { label: 'To', value: 'to' }, { label: 'Amount', value: 'amount' }, { label: 'Method', value: 'method' } ];
  }
  console.log('==============================');

  const csvParser = new json2csv.Parser({ fields });
  const csvData = csvParser.parse(respData);
  res.header('Content-Type', 'text/csv');
  res.attachment(`export-${fileName}`);
  return res.status(200).send(csvData);
};
