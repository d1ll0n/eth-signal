const { X3DH_Sending, generateKeyBundle, sendArgsFromBundles, X3DH_Receiving, receiveArgsFromBundles } = require('eth-x3dh')

async function makeAliceAndBob(withOT = false) {
  const alice = generateKeyBundle()
  const bob = generateKeyBundle(withOT)
  const sendArgs = sendArgsFromBundles(alice.toPrivate(), bob.toPublic())
  if (withOT) {
    const aliceSharedKey = await X3DH_Sending(...sendArgs)
    const receiveArgs = receiveArgsFromBundles(bob.toPrivate(), alice.toPublic())
    const bobSharedKey = await X3DH_Receiving(...receiveArgs)
    return { bob, alice, aliceSharedKey, bobSharedKey }
  } else {
    const sharedKey = await X3DH_Sending(...sendArgs)
    return { alice, bob, sharedKey }
  }
}

module.exports = {
  makeAliceAndBob
}