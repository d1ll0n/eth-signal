const { HKDF, CREATE_AD } = require('eth-x3dh')

const makeHeader = (publicKey, sentCount, prevSentCount) => ({ publicKey, prevSentCount, sentCount })
const hkdfRatchet = (chainKey, secret) => HKDF(chainKey, secret).match(/.{32}/g)
const createAuthData = (pk1, pk2) => pk1 + pk2

module.exports = {
  makeHeader,
  hkdfRatchet,
  createAuthData
}
