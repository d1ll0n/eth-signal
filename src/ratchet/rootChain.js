const { createIdentity: createKeypair } = require('eth-crypto')
const { computeSecret } = require('../crypto/ecUtil')
const { hkdfRatchet } = require('./util')

// Diffie Hellman Ratchet
class RootChain {
  constructor(rootKey, keyPair, pubKey) {
    this.keyPair = keyPair
    this.remoteKey = pubKey
    this.rootKey = rootKey
  }

  get publicKey() { return this.keyPair.publicKey }
  get privateKey() { return this.keyPair.privateKey }

  async ratchetForward(pubKey) {
    if (pubKey) this.remoteKey = pubKey
    else this.keyPair = createKeypair()
    const secret = await computeSecret(this.privateKey, this.remoteKey)
    const [rootKey, chainKey] = hkdfRatchet(this.rootKey, secret)
    this.rootKey = rootKey
    return chainKey
  }
}

module.exports = RootChain