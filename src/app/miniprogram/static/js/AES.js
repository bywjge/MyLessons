const CryptoJS = require('crypto-js')
const __KEY__  = '0x1ec10dForMyLesson'
const key = CryptoJS.enc.Utf8.parse(CryptoJS.MD5(__KEY__).toString())
const iv = CryptoJS.enc.Utf8.parse(CryptoJS.MD5(__KEY__).toString().substr(0,16))
const cfg = { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }

function encrypt(word) {
  const data = CryptoJS.enc.Utf8.parse(word)
  const enc = CryptoJS.AES.encrypt(data, key, cfg)
  return enc.toString()
}

function decrypt(word) {
  const dec = CryptoJS.AES.decrypt(word, key, cfg)
  return CryptoJS.enc.Utf8.stringify(dec).toString()
}

export {
  encrypt,
  decrypt
}