const crypto = require('crypto')

const algorithm = 'aes-256-cbc'

const hash = data => crypto.createHash('sha256').update(data).digest('hex').slice(0, 32)

const newIv = () => crypto.randomBytes(16)

function encrypt(data, password) {
  const iv = newIv()
  const key = hash(password)
  const _cipher = crypto.createCipheriv(algorithm, key, iv)
  const cipher = _cipher.update(data, 'utf8', 'hex') + _cipher.final('hex')
  return {
    cipher,
    iv
  }
}

function decrypt(_cipher, password) {
  const { cipher, iv } = _cipher
  const key = hash(password)
  const _decipher = crypto.createDecipheriv(algorithm, key, iv)
  let decipher = _decipher.update(cipher, 'hex', 'utf8') + _decipher.final('utf8')
  return decipher
}

module.exports = {
  encrypt,
  decrypt
}