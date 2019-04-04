const { expect } = require('chai')

const { DoubleRatchet, createAuthData } = require('../src')
const { makeAliceAndBob } = require('./util')

module.exports = describe('Double Ratchet', () => {
  it('Should establish double ratchets for two users and have the same root key', async () => {
    const { bob, alice, sharedKey } = await makeAliceAndBob()
    const aliceDR = new DoubleRatchet(sharedKey, alice.preKey, bob.preKey.publicKey)
    const bobDR = new DoubleRatchet(sharedKey, bob.preKey, alice.preKey.publicKey)
    await aliceDR.init()
    await bobDR.init()
    aliceDR.ratchetSending()
    bobDR.ratchetReceiving()
    expect(aliceDR.rootChain.rootKey).to.eql(bobDR.rootChain.rootKey);
  })

  it('Should encrypt and decrypt a message using double ratchet', async () => {
    const { bob, alice, sharedKey } = await makeAliceAndBob()
    const AD = createAuthData(bob.identity.publicKey, alice.identity.publicKey)
    const aliceDR = new DoubleRatchet(sharedKey, alice.preKey, bob.preKey.publicKey, AD)
    await aliceDR.init()
    const bobDR = new DoubleRatchet(sharedKey, bob.preKey, alice.preKey.publicKey, AD)
    await bobDR.init()
    const message = "Hello Bob, it's Alice!"
    const msgCipher = await aliceDR.encryptMessage(message)
    const decipher = await bobDR.decryptMessage(msgCipher)
    expect(decipher).to.eql(message);
  })

  it('Should encrypt messages and decrypt them out of order', async () => {
    const { bob, alice, sharedKey } = await makeAliceAndBob()
    const AD = createAuthData(bob.identity.publicKey, alice.identity.publicKey)
    const aliceDR = new DoubleRatchet(sharedKey, alice.preKey, bob.preKey.publicKey, AD)
    await aliceDR.init()
    const bobDR = new DoubleRatchet(sharedKey, bob.preKey, alice.preKey.publicKey, AD)
    await bobDR.init()
    const message = "Hello Bob, it's Alice!"
    let msgCipher = await aliceDR.encryptMessage(message)
    msgCipher = await aliceDR.encryptMessage(message)
    decipher = await bobDR.decryptMessage(msgCipher)
    expect(decipher).to.eql(message);
  })

  it('Should switch keys when new keys from the other party are received', async () => {
    const { bob, alice, sharedKey } = await makeAliceAndBob()
    const AD = createAuthData(bob.identity.publicKey, alice.identity.publicKey)
    const aliceDR = new DoubleRatchet(sharedKey, alice.preKey, bob.preKey.publicKey, AD)
    await aliceDR.init()
    const bobDR = new DoubleRatchet(sharedKey, bob.preKey, alice.preKey.publicKey, AD)
    await bobDR.init()
    const bobKey1 = bobDR.myPubKey
    const aliceKey1 = aliceDR.myPubKey
    const message = "Hello Bob, it's Alice!"
    let msgCipher = await aliceDR.encryptMessage(message)
    let decipher = await bobDR.decryptMessage(msgCipher)
    const response = "Hello Alice, it's Bob!"
    msgCipher = await bobDR.encryptMessage(response)
    decipher = await aliceDR.decryptMessage(msgCipher)
    await aliceDR.encryptMessage(message)
    expect(decipher).to.eql(response);
    const bobKey2 = bobDR.myPubKey
    const aliceKey2 = aliceDR.myPubKey
    expect(bobKey2).not.to.eql(bobKey1)
    expect(aliceKey2).not.to.eql(aliceKey1)
  })

  it('Should decrpyt skipped messages from previous and current chain', async () => {
    const { bob, alice, sharedKey } = await makeAliceAndBob()
    const AD = createAuthData(bob.identity.publicKey, alice.identity.publicKey)
    const aliceDR = new DoubleRatchet(sharedKey, alice.preKey, bob.preKey.publicKey, AD)
    await aliceDR.init()
    const bobDR = new DoubleRatchet(sharedKey, bob.preKey, alice.preKey.publicKey, AD)
    await bobDR.init()
    let ciphers = []
    const message = "Hello Bob, it's Alice!"
    for (let i = 0; i < 10; i++) ciphers.push(await aliceDR.encryptMessage(message + i))
    let decipher9 = await bobDR.decryptMessage(ciphers.pop())
    expect(decipher9).to.eql(message + 9)
    for (let i in ciphers) {
      const decipher = await bobDR.decryptMessage(ciphers[i])
      expect(decipher).to.eql(message + i)
    }
  })

  it('Should serialize and deserialize a double ratchet', async () => {
    const { bob, alice, sharedKey } = await makeAliceAndBob()
    const AD = createAuthData(bob.identity.publicKey, alice.identity.publicKey)
    let aliceDR = new DoubleRatchet(sharedKey, alice.preKey, bob.preKey.publicKey, AD)
    await aliceDR.init()
    let bobDR = new DoubleRatchet(sharedKey, bob.preKey, alice.preKey.publicKey, AD)
    await bobDR.init()
    const message = "Hello Bob, it's Alice!"
    let msgCipher = await bobDR.encryptMessage(message)
    const aliceData = aliceDR.serialize()
    aliceDR = DoubleRatchet.deserialize(aliceData)
    let decipher = await aliceDR.decryptMessage(msgCipher)
    expect(decipher).to.eql(message)
    let ciphers = []
    for (let i = 0; i < 10; i++) ciphers.push(await aliceDR.encryptMessage(message + i))
    let decipher9 = await bobDR.decryptMessage(ciphers.pop())
    let bobData = bobDR.serialize()
    bobDR = DoubleRatchet.deserialize(bobData)
    expect(decipher9).to.eql(message + 9)
    for (let i in ciphers) {
      const decipher = await bobDR.decryptMessage(ciphers[i])
      expect(decipher).to.eql(message + i)
    }
  })
})
