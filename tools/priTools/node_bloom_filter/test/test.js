let bloomFilter = require('../bloomfilter');
let mocha = require('mocha');
var crypto = require('crypto');
//let assert = require('assert');
let uuid = require('uuid');
let chai = require('chai');
let assert = chai.assert;

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

describe('Bloom Filter', function () {
    it('Checks the basic initialisation without options', function (done) {
        let bFilter = new bloomFilter();
        assert.notEqual(bFilter, null);
        //Test for basic functionality
        assert.equal(bFilter.has('hello'), false);
        bFilter.add('hello');
        assert.equal(bFilter.has('hello'), true);
        assert.equal(bFilter.has('world'), false);
        done();
    });

    it('Initialise bloom filter with options', function (done) {
        let bFilter = new bloomFilter({
            optimize: true,
            nElements: 100,
            falsePositiveRate: 0.0001
        });
        bFilter.add('hello');
        assert.equal(bFilter.has('hello'), true);
        done();
    });

    it('Only bloom filters can delele', function (done) {
        let bFilter = new bloomFilter({ isCounting: false });
        //bFilter.delete('hello');
        done();
    });

    function testCounting(min, max) {
        let bFilter = new bloomFilter({ isCounting: true });
        let randomNumber = getRandomInt(min, max);
        for (let i = 0; i < randomNumber; i++) {
            bFilter.add('hello');
        }
        assert.equal(bFilter.has('hello'), true);
        for (let i = randomNumber; i > 0; i--) {
            bFilter.delete('hello');
        }
        assert.equal(bFilter.has('hello'), false);
    };

    it('Counting bloom filters for 4 bits', function (done) {
        testCounting(2, 15);
        done();
    });

    it('Counting bloom filters for 8 bits', function (done) {
        testCounting(16, 255);
        done();
    });

    it('Counting bloom filters for 16 bits', function (done) {
        testCounting(256, 1024);
        done();
    });

    it('Test serialisation and deserialisation', function (done) {
        let bFilter = new bloomFilter();
        bFilter.add('hello');
        let newbFilter = new bloomFilter({}, bFilter.serialize());
        assert.equal(newbFilter.has('hello'), true);
        assert.equal(newbFilter.has('bello'), false);
        newbFilter.add('world');
        assert.equal(newbFilter.has('world'), true);
        assert.equal(bFilter.has('world'), false);
        done();
    });

    it('Large number of insertions', function (done) {
        this.timeout(0);
        let counter = 1000000;
        let desiredFalsePositiveRate = 0.001;
        let bFilter = new bloomFilter({
            optimize: true,
            nElements: counter,
            falsePositiveRate: desiredFalsePositiveRate
        });
        let uuidArray = new Array();
        for (let i = 0; i < 2 * counter; i++) {
            let myuuid = uuid();
            uuidArray.push(myuuid);
        }
        uuidArray.forEach((myuuid, i) => {
            if (i % 2 == 0) {
                bFilter.add(myuuid);
            }
        });
        let falsePositiveCounter = 0;
        uuidArray.forEach((myuuid, index) => {
            if (index % 2 != 0 && bFilter.has(myuuid)) {
                falsePositiveCounter++;
            }
        });
        let falsePositiveRate = falsePositiveCounter / counter;
        assert.isBelow(falsePositiveRate, desiredFalsePositiveRate + 0.01);
        done();
    });

});