const { expect } = require('chai')

const { MessageChain, createAuthData, verifyMAC } = require('../src')
const { makeAliceAndBob } = require('./util')

module.exports = describe('Symmetric Ratchet', () => {
  it('Should do a single symmetric ratchet step for alice and bob and do encryption/decryption', async () => {
    const { bob, alice, sharedKey } = await makeAliceAndBob()
    const ad = createAuthData(bob.identity.publicKey, alice.identity.publicKey)
    const bobMC = new MessageChain(sharedKey, 0, ad, bob.preKey.publicKey, alice.preKey.publicKey)
    const aliceMC = new MessageChain(sharedKey, 0, ad, alice.preKey.publicKey, bob.preKey.publicKey)
    const message = "Hello Alice!"
    const { cipher, headerCipher } = bobMC.ratchetEncrypt(message)
    const decipher = aliceMC.ratchetDecrypt(cipher, bobMC.count - 1)
    expect(decipher).to.eql(message)
  })

  it('Should do many symmetric ratchet steps for alice and bob and do encryption/decryption', async () => {
    const { bob, alice, sharedKey } = await makeAliceAndBob()
    const ad = createAuthData(bob.identity.publicKey, alice.identity.publicKey)
    const bobMC = new MessageChain(sharedKey, 0, ad, bob.preKey.publicKey, alice.preKey.publicKey)
    const aliceMC = new MessageChain(sharedKey, 0, ad, alice.preKey.publicKey, bob.preKey.publicKey)
    const message = "Hello Alice!"
    for (let i = 0; i < 15; i++) bobMC.ratchetEncrypt(message)
    const { cipher, headerCipher } = bobMC.ratchetEncrypt(message)
    const decipher = aliceMC.ratchetDecrypt(cipher, bobMC.count - 1)
    expect(decipher).to.eql(message)
  })

  it('Should decrypt out-of-order messages', async () => {
    const { bob, alice, sharedKey } = await makeAliceAndBob()
    const ad = createAuthData(bob.identity.publicKey, alice.identity.publicKey)
    const bobMC = new MessageChain(sharedKey, 0, ad, bob.preKey.publicKey, alice.preKey.publicKey)
    const aliceMC = new MessageChain(sharedKey, 0, ad, alice.preKey.publicKey, bob.preKey.publicKey)
    const message = "Hello Alice!"
    let ciphers = []
    for (let i = 0; i < 15; i++) ciphers.push(bobMC.ratchetEncrypt(message))
    const { cipher, headerCipher } = bobMC.ratchetEncrypt(message)
    const { sentCount } = JSON.parse(verifyMAC(headerCipher, ad))
    let dec = aliceMC.ratchetDecrypt(cipher, sentCount)
    expect(dec).to.eql(message)
    for (let nCipher of ciphers) {
      const { cipher: ncipher, headerCipher: nheaderCipher } = nCipher
      const { sentCount: nSentCount } = JSON.parse(verifyMAC(nheaderCipher, ad))
      dec = aliceMC.ratchetDecrypt(ncipher, nSentCount)
      expect(dec).to.eql(message)
    }
  })
})
