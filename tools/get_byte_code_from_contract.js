//load token conctract template
function loadAndCompileTokenSol() {
    console.log("load token conctract");
    var fs = require("fs");
    var solFilePath = "/home/sotatek/Desktop/coin (1).sol";//w 
    source = fs.readFileSync(solFilePath, "utf8");
    // console.log(source);
    // fs.closeSync(solFilePath);
    let solc = require("solc");
    // https://ethereum.github.io/solc-bin/bin/soljson-' + versionString + '.js'
    solc.loadRemoteVersion("v0.4.21+commit.dfe3193c");
    compiledContract = solc.compile(source, "--combined-json abi,asm,ast,bin,bin-runtime,clone-bin,devdoc,interface,opcodes,srcmap,srcmap-runtime,userdoc");
    console.log(compiledContract.contracts[":Coin"]);
    return compiledContract;
  
  }
  
  //create token conctract
  function getByteCodeAfterDeloyment() {
    //   var eth = require('../routes/web3relay').eth;
    //   var web3 = require("xdc3");
    //   var solc = require('solc');
    //   web3.setProvider(new web3.providers.HttpProvider('http://localhost:8101/'));

    // return zeroTokenInstance;
  }


var ContractJson = loadAndCompileTokenSol();

// console.log(ContractJson);

let fs = require("fs");
let Web3 = require('web3'); // https://www.npmjs.com/package/web3

let web3 = new Web3();

web3.setProvider(new web3.providers.HttpProvider('https://rpc.xinfin.network'));

// Read the compiled contract code
// Compile with
// solc SampleContract.sol --combined-json abi,asm,ast,bin,bin-runtime,clone-bin,devdoc,interface,opcodes,srcmap,srcmap-runtime,userdoc > contracts.json
let contracts = ContractJson.contracts;

// console.log(contracts);

//console.log(contracts[":Coin"]);
// ABI description as JSON structure
let abi = JSON.parse(contracts[":Coin"].interface);

// // // Smart contract EVM bytecode as hex
let code = '0x' + contracts[":Coin"].bytecode;


//console.log(code)

// // Create Contract proxy class
let sample = web3.eth.contract(abi);

// Unlock the coinbase account to make transactions out of it
console.log("Unlocking coinbase account");
var password = "";
try {
  web3.personal.unlockAccount("0x49114597ef077b8ddfa8c2be2dd35a1fe5c586c3", "d278b1141f204160fcbed9ea0b3c33b74a4f0a2207ec4482b77ffabde8c0c35a");
} catch(e) {
  //console.log(e);   
  
}


console.log("Deploying the contract");
let contract = sample.new({from: "0x49114597ef077b8ddfa8c2be2dd35a1fe5c586c3", gas: 1000000, data: code});

// // Transaction has entered to geth memory pool
// console.log("Your contract is being deployed in transaction at http://testnet.etherscan.io/tx/" + contract.transactionHash);

// // http://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
// function sleep(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// // We need to wait until any miner has included the transaction
// // in a block to get the address of the contract
// async function waitBlock() {
//   while (true) {
//     let receipt = web3.eth.getTransactionReceipt(contract.transactionHash);
//     if (receipt && receipt.contractAddress) {
//       console.log("Your contract has been deployed at http://testnet.etherscan.io/address/" + receipt.contractAddress);
//       console.log("Note that it might take 30 - 90 sceonds for the block to propagate befor it's visible in etherscan.io");
//       break;
//     }
//     console.log("Waiting a mined block to include your contract... currently in block " + web3.eth.blockNumber);
//     await sleep(4000);
//   }
// }

// waitBlock();