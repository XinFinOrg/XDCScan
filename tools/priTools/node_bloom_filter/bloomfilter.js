var mmh3 = require('murmurhash3');
var crypto = require('crypto');
var util = require("util"), events = require("events");
//The Default options are already optimized,according to the equations
let defaultOptions = {
    nBits: 8 * 1024,
    nHash: 10,
    optimize: false,
    falsePositiveRate: 0.001,
    nElements: 569,
    isCounting: false
}
const LN2_SQUARE = Math.LN2 * Math.LN2;
var bloomFilter = function (options, serializedObject) {
    if (serializedObject) {
        deserializeBloomFilter.call(this, serializedObject);
        return;
    }
    events.EventEmitter.call(this);
    options = options || {};
    options = Object.assign(defaultOptions, options);
    this.bits = options.nBits;
    this.hashes = options.nHash;
    if (options.optimize) {
        //Optimize will modify the bits and hashes to obtain optimal
        if (options.nElements == null || options.falsePositiveRate == null) {
            throw new Error('Please mention the number of elements and false Positive rate to optimize');
        }
        optimize(this, options.nElements, options.falsePositiveRate);
    }
    if (this.bits == null || this.hashes == null) {
        throw new Error('Invalid Parameters');
    }
    let byteSize = Math.ceil(this.bits / 8);
    this.bitsPerCounter = 1;
    if (options.isCounting) {

        this.isCounting = true;
        this.bitsPerCounter = 4;
        byteSize = byteSize * this.bitsPerCounter;
    }
    this.buffer = new ArrayBuffer(byteSize);
    this.array = new Uint8Array(this.buffer);
    this.randomSeed = crypto.randomBytes(4).readUInt32BE(0);
    //createSeeds(this);
}
util.inherits(bloomFilter, events.EventEmitter);

bloomFilter.prototype.add = function (element) {
    let positions = getPositionsAfterApplyingHash(this, element);
    positions.forEach((position) => {
        setBit.call(this, this.array, position, this.isCounting);
    });
}

bloomFilter.prototype.has = function (element) {
    let positions = getPositionsAfterApplyingHash(this, element);
    for (let i = 0; i < positions.length; i++) {
        if (!getBit.call(this, this.array, positions[i], this.isCounting)) {
            return false;
        }
    }
    return positions.length > 0 ? true : false;
}

bloomFilter.prototype.getPositions = function (element) {
    let positions = getPositionsAfterApplyingHash(this, element);
    return positions;
}

bloomFilter.prototype.delete = function (element) {
    if (!this.isCounting) {
        throw new Error('Only counting bloom filters can delete');
    }
    let positions = getPositionsAfterApplyingHash(this, element);
    positions.forEach((position) => {
        deleteBit.call(this, this.array, position);
    });
}

bloomFilter.prototype.serialize = function (isJson = false) {
    let byteSize = this.array.byteLength;
    let isCounting = this.isCounting;//1byte
    let bitsPerCounter = this.bitsPerCounter;//1byte
    let hashes = this.hashes;//1 byte
    let idNumber = 214;//1 byte for identification
    let newBuffer = new ArrayBuffer(byteSize + 1 + 1 + 1 + 1 + 8 + 4 + 8);
    let dv = new DataView(newBuffer);
    let writer = 0;
    dv.setUint8(writer++, idNumber);//For identification while deseriaization
    dv.setUint8(writer++, isCounting);
    dv.setUint8(writer++, bitsPerCounter);
    dv.setUint8(writer++, hashes);
    dv.setFloat64(writer, byteSize);
    writer += 8;
    dv.setUint32(writer, this.randomSeed);
    writer += 4;
    dv.setFloat64(writer, this.bits);
    writer += 8;
    let oldDv = new DataView(this.buffer);
    for (let i = 0; i < oldDv.byteLength; i++) {
        dv.setUint8(writer++, oldDv.getUint8(i));
    }
    //newBuffer = Buffer.concat([newBuffer, this.buffer]);
    // this.array.forEach((elem, index) => {
    //     dv.setInt8(writer++, elem);
    // });
    return newBuffer;
}

function deserializeBloomFilter(serialized) {
    if (!serialized instanceof ArrayBuffer) {
        throw new Error('Not an instance of ArrayBuffer'); return;
    }
    let dv = new DataView(serialized);
    if (dv.getUint8(0) !== 214) {
        throw new Error('Signature mismatch');
    }
    let isCounting = dv.getUint8(1);
    this.isCounting = isCounting;
    let bitsPerCounter = dv.getUint8(2);
    this.bitsPerCounter = bitsPerCounter;
    let hashCount = dv.getUint8(3);
    this.hashes = hashCount;
    let byteSize = dv.getFloat64(4);
    let byteRead = 12;
    let randomSeed = dv.getUint32(12);
    this.randomSeed = randomSeed;
    this.bits = dv.getFloat64(16);
    byteRead = 24;
    this.buffer = serialized.slice(byteRead, dv.byteLength);
    this.array = getMyDataView(this.buffer, this.bitsPerCounter);
    /*//this.buffer = 
    this.array = new Uint8Array();
    this.array.forEach((x, index) => {
        if (x > 0) {
            console.log(x, index);
        }
    });
    for (let i = byteRead, counter = 0; i < dv.byteLength; i++ , counter++) {
        //  this.array[counter] = dv.getUint16(i);
    }*/
}


function createSeeds(bloomFilter) {
    let count = bloomFilter.hashes;
    let seeds = bloomFilter.seeds = [];
    for (let i = 0; i < count; i++) {
        let randomNumber = crypto.randomBytes(4).readUInt32BE(0);
        if (seeds.indexOf(randomNumber) != -1 || randomNumber == 0) {
            i--;
        } else {
            seeds.push(randomNumber);
        }
    }
}

function optimize(bloomFilter, numberOfElements, falsePostiveRate) {
    //This function takes in nBits and falsePostiveRate, and transforms bits and k of the instance
    bloomFilter.bits = Math.ceil(-1 * numberOfElements * (Math.log(falsePostiveRate)) / LN2_SQUARE);
    bloomFilter.hashes = Math.ceil((bloomFilter.bits / numberOfElements) * Math.LN2);
}

function getMyDataView(buffer, bitsPerCounter) {
    //Returns the data view, Uint8, UInt16.. Depending upon counter that is being passed
    if (bitsPerCounter == 8 || bitsPerCounter == 4 || bitsPerCounter == 1) {
        return new Uint8Array(buffer);
    } else if (bitsPerCounter == 16) {
        return new Uint16Array(buffer);
    } else if (bitsPerCounter == 32) {
        return new Uint32Array(buffer);
    } else if (bitsPerCounter > 32) {
        //I guess throw error
    }
}

function copyArrayCounters(oldDataView, newDataView, newBitsPerCounter) {
    if (newBitsPerCounter == 8) {
        //The previous was 4 and, since one array item holded two counters(4+4)bits, it requires a special treatment to copy
        let index = 0;
        oldDataView.forEach((oldItem, oldIndex) => {
            //Divide oldItem into two, 4+4 bits and then insert both into newElement
            let nibbles = getNibblesFromInteger(oldItem);
            newDataView[index++] = nibbles[0];
            if (oldIndex != 0) {
                newDataView[index++] = nibbles[1];
            }
        });
    } else {
        let index = 0;
        oldDataView.forEach((oldItem) => {
            newDataView[index++] = oldItem;
        })
    }
}

function setBit(buffer, position, isCounting) {
    if (!isCounting) {
        let bufferPosition = Math.floor(position / 8);
        let bitPosition = position % 8;
        let element = buffer[bufferPosition];
        element = element | (1 << bitPosition);
        buffer[bufferPosition] = element;
    } else {
        let bufferPosition = -1, nibblePosition = -1;
        if (this.bitsPerCounter == 4) {
            let byteLocation = (8 / this.bitsPerCounter) * position / this.bitsPerCounter;
            bufferPosition = Math.ceil(byteLocation);
            position % 2 != 0 ? nibblePosition = 0 : nibblePosition = 1;
        } else {
            bufferPosition = position;
        }
        let element = buffer[bufferPosition];
        //Now if the bitsPerCounter is 4 then take a nibble 
        if (nibblePosition != -1) {
            let nibbles = getNibblesFromInteger(element);
            nibblePosition == 0 ? element = nibbles[0] : element = nibbles[1];
        }
        if (element >= Math.pow(2, this.bitsPerCounter) - 1) {
            //Resize this array
            this.bitsPerCounter = 2 * this.bitsPerCounter;
            const newBuffer = new ArrayBuffer(this.bits * (this.bitsPerCounter / 8));
            //Now copy the data from old buffer to new buffer and reassign the buffer in bloomfilter
            const newDataView = getMyDataView(newBuffer, this.bitsPerCounter);
            copyArrayCounters(this.array, newDataView, this.bitsPerCounter);
            this.array = newDataView;
            this.buffer = newBuffer;
            //Shoot a notification via eventEmitter
            this.emit('resized', this.bitsPerCounter);
            setBit.call(this, this.array, position, this.isCounting);
        } else {
            if (this.bitsPerCounter > 4) {
                element++;
                buffer[bufferPosition] = element;
            } else {
                //Take both the nibbles, increment one and then concatenate them to modify the buffer
                element = buffer[bufferPosition];
                let nibbles = getNibblesFromInteger(element);
                nibblePosition == 0 ? nibbles[0]++ : nibbles[1]++;
                buffer[bufferPosition] = getIntergerFromNibbles(nibbles);
            }
        }
    }
}

function getBit(buffer, position, isCounting) {
    if (!isCounting) {
        let bufferPosition = Math.floor(position / 8);
        let bitPosition = position % 8;
        let element = buffer[bufferPosition];
        return (element & (0x1 << bitPosition));
    } else {
        let bufferPosition = -1, bitPosition = -1;
        if (this.bitsPerCounter == 4) {
            let byteLocation = (8 / this.bitsPerCounter) * position / this.bitsPerCounter;
            bufferPosition = Math.ceil(byteLocation);
            let element = buffer[bufferPosition];
            //slice the number to half, using binary representation and then find nibble1 and nibble2
            let nibbles = getNibblesFromInteger(element);
            position % 2 != 0 ? bitPosition = 0 : bitPosition = 1;
            let selectedNibble = null;
            bitPosition == 0 ? selectedNibble = nibbles[0] : selectedNibble = nibbles[1];
            return selectedNibble > 0 ? 1 : 0;
        } else {
            bufferPosition = position;
            return buffer[bufferPosition] > 0 ? 1 : 0;
        }
    }

}

function deleteBit(buffer, position) {
    if (!this.isCounting) {
        let bufferPosition = position;
        buffer[bufferPosition] = buffer[position] == 0 ? 0 : buffer[position] - 1;
    } else {
        if (this.bitsPerCounter == 4) {
            let byteLocation = (8 / this.bitsPerCounter) * position / this.bitsPerCounter;
            bufferPosition = Math.ceil(byteLocation);
            let element = buffer[bufferPosition];
            let nibbles = getNibblesFromInteger(element);
            position % 2 != 0 ? bitPosition = 0 : bitPosition = 1;
            bitPosition == 0 ? nibbles[0] > 0 ? nibbles[0]-- : nibbles[0] : nibbles[1] > 0 ? nibbles[1]-- : nibbles[1];
            buffer[bufferPosition] = getIntergerFromNibbles(nibbles);
        } else {
            let bufferPosition = position;
            buffer[bufferPosition] = buffer[position] == 0 ? 0 : buffer[position] - 1;
        }
    }
}

function getIntergerFromNibbles(nibbles = []) {
    let element = 0;
    let count = 0;
    while (count <= 7) {
        let selectedNibble = count <= 3 ? nibbles[1] : nibbles[0];
        let mask = 1 << count;
        let nibbleMask = count <= 3 ? mask : 1 << count - 4;
        if ((selectedNibble & nibbleMask) != 0) {
            element |= mask;
        } else {
            element &= ~mask;
        }
        count++;
    }
    return element;
}

function getNibblesFromInteger(element) {
    let nibble1, nibble2 = 0;
    let count = 0;
    while (count <= 3) {
        let mask = 1 << count;
        if ((element & mask) != 0) {
            nibble1 |= mask;
        } else {
            nibble1 &= ~mask;
        }
        count++;
    }
    count = 4;
    while (count <= 7) {
        let byteMask = 1 << count;
        let nibbleMask = 1 << (count - 4);
        if ((element & byteMask) != 0) {
            nibble2 |= nibbleMask;
        } else {
            nibble2 &= ~nibbleMask;
        }
        count++;
    }
    return [nibble2, nibble1];
}

//Hashing using the seeds generated above
function getPositionsAfterApplyingHash(bloomFilter, element) {
    let positionArray = [];
    let pos = mmh3.murmur128Sync(element.toString(), bloomFilter.randomSeed);
    for (let i = 1; i <= bloomFilter.hashes; i++) {
        //Ensure that positions are unqiue other wise it will cause counting blooming flter to be errorneous
        let position = pos[0] + i * pos[1];
        position = position % (bloomFilter.bits - 1);
        positionArray.push(position);
    }
    return positionArray;
}

module.exports = bloomFilter;