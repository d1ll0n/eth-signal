const { expect } = require('chai')
const { makeAliceAndBob } = require('./util')

module.exports = describe('X3DH Key Exchange', () => {
  it('Should perform a key exchange with ephemeral and identity keys', async () => {
    const { sharedKey } = await makeAliceAndBob()
    expect(sharedKey).to.be.ok
  })

  it('Should perform a key exchange with ephemeral, one-time and identity keys', async () => {
    const { aliceSharedKey, bobSharedKey } = await makeAliceAndBob(true)
    expect(aliceSharedKey).to.eq(bobSharedKey)
  })
})