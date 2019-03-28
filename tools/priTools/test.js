var s1;
var s2;
var elems = [];
var elemLen = 15000000;
var falseRate = 0.00000015;
var makestrTime=0;

var bloomFilter = require('./node_bloom_filter/bloomfilter');
// let bFilter = new bloomFilter({
//     nHash:16,
//     nBits:1024*64
// });
let bFilter = new bloomFilter({
    optimize: true,/*This automatically calculates number of hashes and bits to be used internally*/
    falsePositiveRate: falseRate,/*Desired false positive rate,less rate will use more memory internally*/
    isCounting: false,// False by default,
    nElements:elemLen
});


// s1=new Date().getTime();
// for(var i=0; i<elemLen; i++){
//     var elem = "10000000000000000000"+i;
// }
// s2=new Date().getTime();
// makestrTime = s2-s1;
// console.log("make string:", makestrTime);


// s1=new Date().getTime();
// for(var i=0; i<elemLen; i++){
//     var elem = "10000000000000000000"+i;
//     elems.push(elem);
// }
// s2=new Date().getTime();
// console.log("push elem:",s2-s1-makestrTime);


s1=new Date().getTime();
for(var i=0; i<elemLen; i++){
    var elem = "10000000000000000000"+i;
    bFilter.add(elem);
}
s2=new Date().getTime();
console.log("add to bloom:",s2-s1-makestrTime);

function test1(){
    // s1=new Date().getTime();
    // for(var j=0; j<100; j++){
    //     elems.indexOf("10000000000000000000"+(90000+j));
    // }
    // s2=new Date().getTime();
    // console.log("test1 time:", s2-s1);
}

var bloomWrongNum = 0;
function test2(){
    s1=new Date().getTime();
    for(var j=0; j<elemLen; j++){
        var elem = "20000000000000000000"+(1000+j);
        if(bFilter.has(elem)){
            bloomWrongNum++;
        }
    }
    s2=new Date().getTime();
    console.log("test2 time:", s2-s1);
    console.log("bloomWrongNum:",bloomWrongNum)
}

console.log("begin test...");
test1();
test2();