const { makeHeader, hkdfRatchet } = require('./util')
const { encrypt, decrypt } = require('../crypto/cipher')
const { createMAC } = require('../crypto/mac')

// Symmetric Ratchet
class MessageChain {
  constructor(chainKey, prevCount, ad, myPubKey, remotePubKey) {
    this.chainKey = chainKey
    this.count = prevCount + 1
    this.prevCount = prevCount
    this.myPubKey = myPubKey
    this.remotePubKey = remotePubKey
    this.ad = ad
    this.skippedKeys = {}
  }

  get pendingCount() { return Object.keys(this.skippedKeys).length }

  ratchetKey() {
    let msgKey
    [this.chainKey, msgKey] = hkdfRatchet(this.chainKey)
    return msgKey
  }

  ratchetEncrypt(message) {
    const key = this.ratchetKey()
    let header = makeHeader(this.myPubKey, this.count++, this.prevCount)
    if (this.ad) header = createMAC(JSON.stringify(header), this.ad)
    const cipher = encrypt(message, key)
    return { cipher, headerCipher: header }
  }

  ratchetDecrypt(cipher, msgCount) {
    let key
    if (this.skippedKeys[msgCount]) {
      key = this.skippedKeys[msgCount]
      delete this.skippedKeys[msgCount]
    }
    else if (msgCount != this.count) {
      for (let i = this.count; i < msgCount; i ++) {
        this.skippedKeys[i] = this.ratchetKey()
        this.count++
      }
      key = this.ratchetKey()
    }
    else {
      key = this.ratchetKey()
      this.count++
    }
    return decrypt(cipher, key)
  }
}

module.exports = MessageChain
