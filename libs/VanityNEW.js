const crypto = require('crypto');
const keccak = require('keccak');
const curve = 'prime256v1'; /* OpenSSL curve name */
var ERRORS = {
    invalidHex: "Invalid hex input",
    invalidBase58: "Invalid base58 input"
}
const encode = (data) => {
    let ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    let BASE = ALPHABET.length
    let LEADER = ALPHABET.charAt(0)
    let FACTOR = Math.log(BASE) / Math.log(256) // log(BASE) / log(256), rounded up
    let iFACTOR = Math.log(256) / Math.log(BASE) // log(256) / log(BASE), rounded up

    let prefix = '00'
    let encoding = 'hex'

    if (typeof data === 'string') {
        data = new Buffer(data, encoding)
    }
    if (!(data instanceof Buffer)) {
        throw new TypeError('"data" argument must be an Array of Buffers')
    }
    if (!(prefix instanceof Buffer)) {
        prefix = new Buffer(prefix, encoding)
    }
    let hash = Buffer.concat([prefix, data])
    hash = crypto.createHash('sha256').update(hash).digest()
    hash = crypto.createHash('sha256').update(hash).digest()
    hash = Buffer.concat([prefix, data,  hash.slice(0, 4)])

    let source = hash

    if (!Buffer.isBuffer(source)) throw new TypeError('Expected Buffer')
    if (source.length === 0) return ''

    // Skip & count leading zeroes.
    let zeroes = 0
    let length = 0
    let pbegin = 0
    const pend = source.length

    while (pbegin !== pend && source[pbegin] === 0) {
        pbegin++
        zeroes++
    }

    // Allocate enough space in big-endian base58 representation.
    const size = ((pend - pbegin) * iFACTOR + 1) >>> 0
    const b58 = new Uint8Array(size)

    // Process the bytes.
    while (pbegin !== pend) {
        let carry = source[pbegin]

        // Apply "b58 = b58 * 256 + ch".
        let i = 0
        for (let it = size - 1; (carry !== 0 || i < length) && (it !== -1); it--, i++) {
            carry += (256 * b58[it]) >>> 0
            b58[it] = (carry % BASE) >>> 0
            carry = (carry / BASE) >>> 0
        }

        if (carry !== 0) throw new Error('Non-zero carry')
        length = i
        pbegin++
    }

    // Skip leading zeroes in base58 result.
    let it = size - length
    while (it !== size && b58[it] === 0) {
        it++
    }

    // Translate the result into a string.
    let str = LEADER.repeat(zeroes)
    for (; it < size; ++it) str += ALPHABET.charAt(b58[it])

    return str
};
const isHexPrefixed = (str) => {
    if (typeof str !== 'string') {
        throw new Error("[is-hex-prefixed] value must be type 'string', is currently type " + (typeof str) + ", while checking isHexPrefixed.");
    }

    return str.slice(0, 2) === '0x';
}
const stripHexPrefix = (str) => {
    if (typeof str !== 'string') {
        return str;
    }

    return isHexPrefixed(str) ? str.slice(2) : str;
};

const toChecksumAddress = (address) => {
    address = stripHexPrefix(address).toLowerCase()

    // const prefix = eip1191ChainId !== undefined ? eip1191ChainId.toString() + '0x' : ''

    const hash = keccak('keccak256').update(Buffer.from(address, 'hex')).toString('hex')
    let ret = '0x'

    for (let i = 0; i < address.length; i++) {
        if (parseInt(hash[i], 16) >= 8) {
            ret += address[i].toUpperCase()
        } else {
            ret += address[i]
        }
    }

    return ret
}
const toNewAddress = (address) => {
    if (address.slice(0,2) === '0x') {
        address = address.slice(2);
    }
    const bytes = Buffer.from('03f4' + address, 'hex');
    const newAddress = encode(bytes); // base58check.encode(bytes);

    return 'NEW' + newAddress;
};
var getRandomWallet = function() {
    const ecdh = crypto.createECDH(curve);
    ecdh.generateKeys();
    var key = ecdh.getPrivateKey();
    var pub = ecdh.getPublicKey();
    var address = '0x' + keccak('keccak256').update(pub.slice(1)).digest().slice(-20).toString('hex');
    var newAddress = toNewAddress(address);
    return {
        address: address,
        newAddress: newAddress,
        privKey: key.toString('hex')
    };
}
var isValidHex = function(hex) {
    if (!hex.length) return true;
    hex = hex.toUpperCase();
    var re = /^[0-9A-F]+$/g;
    return re.test(hex);
}
var isValidBase58 = function(hex) {
    if (!hex.length) return true;
    var re = /^[1-9A-HJ-NP-Za-km-z]+$/g;
    return re.test(hex);
}
var isValidVanityWallet = function(wallet, input, isChecksum, isHex, isSuffix) {
    if (isHex) {
        var _add = wallet.address;
        _add = isChecksum ? toChecksumAddress(_add) : _add;
        if (isSuffix) {
            return _add.substr(_add.length - input.length, input.length) == input;
        }
        return _add.substr(2, input.length) == input;
    }
    var _add = wallet.newAddress;
    _add = isChecksum ? _add : _add.toLowerCase();
    if (isSuffix) {
        return _add.substr(_add.length - input.length, input.length) == input;
    }
    return _add.substr(6, input.length) == input;
}
var getVanityWallet = function(input = '', isChecksum = false, isHex = false, isSuffix = false, counter = function(){}) {
    if (isHex && !isValidHex(input)) throw new Error(ERRORS.invalidHex);
    if (!isHex && !isValidBase58(input)) throw new Error(ERRORS.invalidBase58);
    input = isChecksum ? input : input.toLowerCase();
    var _wallet = getRandomWallet();
    while (!isValidVanityWallet(_wallet, input, isChecksum, isHex, isSuffix)) {
        counter()
        _wallet = getRandomWallet(isChecksum);
    }
    if (isChecksum) _wallet.address = toChecksumAddress(_wallet.address);
    return _wallet;
}
module.exports = {
    getVanityWallet: getVanityWallet,
    isValidHex: isValidHex,
    isValidBase58: isValidBase58,
    ERRORS: ERRORS
}
