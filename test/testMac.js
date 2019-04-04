const { expect } = require('chai')
const { createMAC, verifyMAC } = require('../src')

module.exports = describe('Message Authentication Codes', () => {
  it('Should create and verify a MAC', () => {
    const msg = 'hello'
    const ad = 'auth data'
    const mac = createMAC(msg, ad)
    expect(verifyMAC(mac, ad)).to.eql(msg)
  })
})
