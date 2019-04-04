const { X3DH_Receiving, X3DH_Sending, generateKeyBundle, sendArgsFromBundles, receiveArgsFromBundles } = require('eth-x3dh')
const { expect } = require('chai')

const { RootChain } = require('../src')

module.exports = describe('Diffie Hellman Ratchet', () => {
  it('Should do a single DH ratchet step resulting in the same root key and message key', async () => {
    const bob = generateKeyBundle()
    const alice = generateKeyBundle()
    const sendArgs = sendArgsFromBundles(alice.toPrivate(), bob.toPublic())
    const x3dhSending = await X3DH_Sending(...sendArgs)
    const receiveArgs = receiveArgsFromBundles(bob.toPrivate(), alice.toPublic())
    const x3dhReceiving = await X3DH_Receiving(...receiveArgs)
    const aliceRoot = new RootChain(x3dhSending, alice.preKey, bob.preKey.publicKey)
    const aliceMK = await aliceRoot.ratchetForward()
    const bobRoot = new RootChain(x3dhReceiving, bob.preKey, alice.preKey.publicKey)
    const bobMK = await bobRoot.ratchetForward(aliceRoot.keyPair.publicKey)
    expect(bobMK).to.eql(aliceMK);
    expect(bobRoot.rootKey).to.eql(aliceRoot.rootKey);
  })

  it('Should do several forward ratchets resulting in the same root keys and message keys', async () => {
    const bob = generateKeyBundle()
    const alice = generateKeyBundle()
    const sendArgs = sendArgsFromBundles(alice.toPrivate(), bob.toPublic())
    const x3dhSending = await X3DH_Sending(...sendArgs)
    const receiveArgs = receiveArgsFromBundles(bob.toPrivate(), alice.toPublic())
    const x3dhReceiving = await X3DH_Receiving(...receiveArgs)
    const aliceRoot = new RootChain(x3dhSending, alice.preKey, bob.preKey.publicKey)
    const bobRoot = new RootChain(x3dhReceiving, bob.preKey, alice.preKey.publicKey)
    let aliceMK, bobMK
    aliceMK = await aliceRoot.ratchetForward()
    bobMK = await bobRoot.ratchetForward(aliceRoot.keyPair.publicKey)
    for (let i = 0; i < 15; i++) {
      aliceMK = await aliceRoot.ratchetForward(bobRoot.keyPair.publicKey)
      bobMK = await bobRoot.ratchetForward(aliceRoot.keyPair.publicKey)
    }
    expect(bobMK).to.eql(aliceMK);
    expect(bobRoot.rootKey).to.eql(aliceRoot.rootKey);
  })
})
