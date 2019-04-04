const { createHash } = require('crypto')
const { encrypt, decrypt } = require('./cipher')

const hash = data => createHash('sha256').update(data).digest('hex')

function createMAC(data, ad) {
  const cipher = encrypt(data, ad)
  const mac = hash(cipher + ad)
  return { cipher, mac }
}

function verifyMAC(MAC, ad) {
  const { cipher, mac } = MAC
  if (mac != hash(cipher + ad)) return false
  return decrypt(cipher, ad)
}

module.exports = {
  createMAC,
  verifyMAC
}
