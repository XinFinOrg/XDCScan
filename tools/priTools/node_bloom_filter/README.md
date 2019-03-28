# Node Bloom filter 

Node bloom filter is a sophisticated Bloom filter available for NodeJs which can be optionally transformed to a counting bloom filter and can thus perform delete operations as well.

  - Supports **deletions**
  - Can yield a desired false positive rate(probability) when given the total number of elements in the sets
  - Supports an optimisation flag to calculate the number of hashes and bits to use internally
  - Serialization to an Arraybuffer, which can be converted to JSON/UTF-8/base64 and is left to the user :)
  - Dynamically resizes the underlying Arraybuffer to handle the counter overflows when used as a counting bloom filter.
  - Implements double hashing technique to generate multiple hashes using ***murmur3***
  - Uses bit manipulations to optimise on memory usage
  - When implemented as a counting bloom filter, it can support ***4,8,16,32*** bits per counters to handle overflows
  - Extends Events to notify when the underlying Arraybuffer is resized

## Getting Started

To install: `npm install node_bloom_filter`

## Usage

### Bloom Filter
To create a general implementation, pass the following in the constructor:
```javascript
let bFilter = new bloomFilter({
    nHash:10,
    nBits:1024*8
});
```
If no options are passed, the filter created by default can support ***569*** members with a false rate of upto ***0.001***

To create the optimized implementation, pass an object in the constructor:
```javascript
let bFilter = new bloomFilter({
    optimize: true,/*This automatically calculates number of hashes and bits to be used internally*/
    falsePositiveRate: 0.001,/*Desired false positive rate,less rate will use more memory internally*/
    isCounting: false,// False by default,
    nElements:10000
});
```

To create a counting bloom Filter that supports **deletions** as well, just pass 
```javascript
let bFilter = new bloomFilter({
    optimize: true,/*This automatically calculates number of hashes and bits to be used internally*/
    falsePositiveRate: 0.001,/*Desired false positive rate,less rate will use more memory internally*/
    isCounting: true,// False by default,
    nElements:10000
});
```

#### Add an element
```javascript
bFilter.add('hello world');
```

#### Test for membership
```javascript
if(bFilter.has('hello world')===true){
    console.log('Present, but may be a false positive');
}else{
    console.log('Not present definitely');
}
```
#### Delete
This is available only for couting bloom filters
```javascript 
bFilter.delete('hello world');
```

#### Serialization and Deserialization
```javascript
let bFilterArrayBuffer=bFilter.serialize();
let newFilter=new bloomFilter({},bFilterArrayBuffer);
newFilter.add('hello, i am the best bloom filter');
```
### On resize
```javascript
bFilter.on('resized',(bitsPerCounter)=>{
    console.log('bits per counter',bitsPerCounter);
});
```

## Test
To test: `npm run test`

## Acknowledgements
  - Hat tip to anyone who uses and contributes to the code....
  - Purav Aggarwal :)