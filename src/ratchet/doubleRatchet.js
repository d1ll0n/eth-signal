const MessageChain = require('./messageChain')
const RootChain = require('./rootChain')
const { verifyMAC } = require('../crypto/mac')

class DoubleRatchet {
  constructor(sharedKey, keyPair, theirPubKey, ad) {
    this.keyPair = keyPair
    this.ad = ad
    this.rootChain = new RootChain(sharedKey, keyPair, theirPubKey)
    this.theirPubKey = theirPubKey
    this.pendingReceivingChains = []
    this.lastMessageWasFromRemote = false
  }

  serialize() {
    return JSON.stringify(this)
  }

  static deserialize(json) {
    const obj = JSON.parse(json)
    const ratchet = new DoubleRatchet()
    Object.assign(ratchet, obj)
    ratchet.pendingReceivingChains = []
    for (let msgChainObj of obj.pendingReceivingChains) {
      ratchet.pendingReceivingChains.push(Object.assign(new MessageChain(), msgChainObj))
    }
    ratchet.rootChain = Object.assign(new RootChain(), obj.rootChain)
    ratchet.sendingChain = Object.assign(new MessageChain(), obj.sendingChain)
    ratchet.receivingChain = Object.assign(new MessageChain(), obj.receivingChain)
    return ratchet
  }

  async init() {
    const chainKey = await this.rootChain.ratchetForward(this.theirPubKey)
    this.sendingChain = new MessageChain(chainKey, 0, this.ad, this.myPubKey, this.theirPubKey)
    this.receivingChain = new MessageChain(chainKey, 0, this.ad, this.myPubKey, this.theirPubKey)
  }

  get myPubKey() { return this.keyPair.publicKey }

  async encryptMessage(message) {
    if (this.lastMessageWasFromRemote) {
      await this.ratchetSending()
    }
    this.lastMessageWasFromRemote = false
    return this.sendingChain.ratchetEncrypt(message)
  }

  async decryptMessage(msg) {
    const { cipher, headerCipher } = msg
    const header = JSON.parse(verifyMAC(headerCipher, this.ad))
    const { publicKey, sentCount, prevSentCount } = header
    let receivingChain = this.receivingChain
    if (publicKey == receivingChain.remotePubKey) {
      if (sentCount >= receivingChain.count) this.lastMessageWasFromRemote = true
      return receivingChain.ratchetDecrypt(cipher, sentCount)
    }
    if (prevSentCount >= this.receivingChain.count) {
      this.lastMessageWasFromRemote = true
      if (prevSentCount !== receivingChain.count) pendingReceivingChains.push(receivingChain) // skipped some msgs
      await this.ratchetReceiving(publicKey, prevSentCount)
      return this.receivingChain.ratchetDecrypt(cipher, sentCount)
    }
    return this.tryDecryptPending(cipher, publicKey, sentCount)
  }

  tryDecryptPending(cipher, pubKey, count) {
    for (let i in this.pendingReceivingChains) {
      let receivingChain = this.pendingReceivingChains[i]
      if (receivingChain.remotePubKey == pubKey) {
        let nextChain = this.pendingReceivingChains[i+1] || this.receivingChain
        let msg = receivingChain.ratchetDecrypt(cipher, count)
        if (nextChain.prevCount == count) delete this.pendingReceivingChains[i]
        delete this.pendingReceivingChains[i]
        return msg
      }
    }
    return null
  }

  async ratchetSending() {
    const chainKey = await this.rootChain.ratchetForward()
    this.keyPair = this.rootChain.keyPair
    this.sendingChain = new MessageChain(chainKey, this.sendingChain.count, this.ad, this.myPubKey)
  }

  async ratchetReceiving(theirPubKey, prevSentcount) {
    const chainKey = await this.rootChain.ratchetForward(theirPubKey)
    this.keyPair = this.rootChain.keyPair
    this.receivingChain = new MessageChain(chainKey, prevSentcount, this.ad, this.myPubKey, theirPubKey)
  }
}

module.exports = DoubleRatchet
