const { derive } = require('eccrypto')
const { 
  encryptWithPublicKey: ecEncryptWithPublicKey,
  decryptWithPrivateKey: ecDecryptWithPrivateKey,
  publicKey: { decompress: decompressPubkey },
  util: { removeTrailing0x },
  cipher: {
    parse: parseCipher,
    stringify: stringifyCipher
  },
  createIdentity: createKeypair
} = require('eth-crypto')

function computeSecret(privateKey, publicKey) {
  const pubKey = '04' + decompressPubkey(publicKey)
  const privKey = removeTrailing0x(privateKey)
  return derive(Buffer.from(privKey, 'hex'), Buffer.from(pubKey, 'hex'))
}

function encryptWithPublicKey(publicKey, message, serialize = true) {
  const cipher = ecEncryptWithPublicKey(publicKey, message)
  return serialize ? stringifyCipher(cipher) : cipher
}

function decryptWithPrivateKey(cipher, privateKey) {
  const _cipher = typeof cipher == 'string' ? parseCipher(cipher) : cipher
  return ecDecryptWithPrivateKey(_cipher, privateKey)
}

module.exports = {
  createKeypair,
  computeSecret,
  encryptWithPublicKey,
  decryptWithPrivateKey
}