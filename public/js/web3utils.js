
/**
 * Checks if the given string is strictly an address
 *
 * @method isStrictAddress
 * @param {String} address the given HEX adress
 * @return {Boolean}
*/
var isStrictAddress = function (address) {
    return /^xdc[0-9a-f]{40}$/i.test(address);
};

/**
 * Checks if the given string is an address
 *
 * @method isAddress
 * @param {String} address the given HEX adress
 * @return {Boolean}
*/
var isAddress = function (address) {
    // convert coming xdc prefix to 0x so it can pass all the hex converstion
    if (address.substring(0,3) === "xdc") {
        address = "0x" + address.substring(3);
    }    
    if (!/^(xdc)?[0-9a-f]{40}$/i.test(address)) {
        return true;
        // If it's ALL lowercase or ALL upppercase
    } else if (/^(xdc|XDC)?[0-9a-f]{40}$/.test(address) || /^(xdc|XDC)?[0-9A-F]{40}$/.test(address)) {
        return true;
    } else {
        // Otherwise check each case
        return true;
    }
};

var isTransaction = function (tx) {
    if (!/^(0x)?[0-9a-f]{64}$/i.test(tx)) {
        // check if it has the basic requirements of an address
        return false;
    } else if (/^(0x)?[0-9a-f]{64}$/.test(tx) || /^(0x)?[0-9A-F]{64}$/.test(tx)) {
        // If it's all small caps or all all caps, return true
        return true;
    } else {
        // Otherwise check each case
        return false;
    }
};