## :warning: :warning: :warning: WARNING :warning: :warning: :warning:
> This is experimental cryptographic software under development. It has not been professionally audited; as such, you should not use it for critical infrastructure without personally reviewing the code.

# eth-signal

A JavaScript implementation of the Signal Protocol using secp256k1 keypairs. Can be used on Node.js or in a browser using webpack.
 
## Signal Protocol
The Signal Protocol was designed by Open Whisper Systems to provide secure end-to-end encryption for messaging while maintaining perfect forward secrecy. PFS is provided by the fact that all messages are encrypted using new symmetric keys which are derived from shared secrets between keypairs held by each party, which are also swapped out regularly.
The signal protocol is also meant to maintain deniability in messaging. This is acheived largely through the x3dh key exchange method, where 1-2 ephemeral keys and 1 identity key from each party are used to derive shared secrets that begin a messaging session. Since deriving a shared secret for an identity key does not prove that that identity key actually encrypted a message, Signal does not provide any method to prove that a specific user is involved in any messaging. One issue with Signal is that the ephemeral keys used to begin message chains (pre-keys) are actually signed by the identity key, which in my opinion is detrimental to the deniability aspect of the protocol.

## Why eth-signal?
Signal uses the X448 and X25519 elliptic curves, which are incompatible with the secp256k1 curve used for Ethereum keypairs. Additionally, the JavaScript library for Signal can not be used outside of the browser without significant modifications. I wanted to build a library people can use on any platform for secure, deniable messaging where Ethereum keys are used as identity keys.

## Installation
```sh
$ npm install eth-signal --save
```

## Usage
This library is simplified from the original Signal library. You really only need to be concerned with eight functions: X3DH_Sending(), X3DH_Receiving(), new DoubleRatchet(), ratchet.init(), ratchet.serialize(), DoubleRatchet.deserialize(), createAuthData(), ratchet.encryptMessage() and ratchet.decryptMessage().

To start a double ratchet for messaging, you first need to derive a shared secret between the two parties. The preferred method is using the X3DH key exchange. When using the X3DH key exchange, you can optionally use a third key for the recipient called a one-time key. If you do use a one-time key, the public key must be provided as the last argument in the X3DH_Sending call and the private key provided as the last argument in the X3DH_Receiving call.
```js
const { X3DH, DoubleRatchet, createKeypair, createAuthData } = require('eth-signal')
async function test() {
    const aliceIdentity = createKeypair()
    const alicePreKey = createKeypair()
    const bobIdentity = createKeypair()
    const bobPreKey = createKeypair()
    const authData = createAuthData(aliceIdentity.publicKey, bobIdentity.publicKey)
    const aliceSharedKey = await X3DH.X3DH_Sending(aliceIdentity.privateKey, alicePreKey.privateKey, bobIdentity.publicKey, bobPreKey.publicKey)
    const bobSharedKey = await X3DH.X3DH_Receiving(bobIdentity.privateKey, bobPreKey.privateKey, aliceIdentity.publicKey, alicePreKey.publicKey)
    const aliceDoubleRatchet = new DoubleRatchet(aliceSharedKey, alicePreKey, bobPreKey.publicKey, authData)
    await aliceDoubleRatchet.init()
    let bobDoubleRatchet = new DoubleRatchet(bobSharedKey, bobPreKey, alicePreKey.publicKey, authData)
    await bobDoubleRatchet.init()
    const message = "Hello bob!"
    const msgCipher = await aliceDoubleRatchet.encryptMessage(message)
    const decipher = await bobDoubleRatchet.decryptMessage(msgCipher)
    console.log(`Decryption test: ${decipher == message ? 'PASS' : 'FAIL'}`)
    const message2 = "Hey bob why aren't you responding?"
    const msgCipher2 = await aliceDoubleRatchet.encryptMessage(message2)
    let serialBob = bobDoubleRatchet.serialize()
    bobDoubleRatchet = DoubleRatchet.deserialize(serialBob)
    const decipher2 = await bobDoubleRatchet.decryptMessage(msgCipher2)
    console.log(`Serialization test: ${decipher2 == message2 ? 'PASS' : 'FAIL'}`)
}
test()
> Decryption test: PASS
> Serialization test: PASS
```


You can find more usage examples in the /test folder.
##### Note
Once a message has been decrypted, the key used to decrypt it is immediately deleted. If you want to keep messages between sessions you will need to use a custom method to do this, but keep in mind that this may significantly affect the security model of your messenger. We strongly recommend that decrypted messages only be kept on the device used to decrypt a message.

## Methods
#### X3DH.X3DH_Sending(myIdKeyPrivate, myPreKeyPrivate, theirIdKeyPublic, theirPreKeyPublic, theirOTKeyPublic)
Creates a shared key by getting the shared secrets of (myIdKeyPrivate, theirPreKeyPublic), (myPreKeyPrivate, theirIdKeyPublic), (myPreKeyPrivate, theirPreKeyPublic), and (myPreKeyPrivate, theirOTKeyPublic) if theirOTKeyPublic is provided, then using them all as an input to the HKDF function.

#### X3DH.X3DH_Receiving(myIdKeyPrivate, myPreKeyPrivate, theirIdKeyPublic, theirPreKeyPublic, myOTKeyPrivate)
Creates a shared key by getting the shared secrets of (myIdKeyPrivate, theirPreKeyPublic), (myPreKeyPrivate, theirIdKeyPublic), (myPreKeyPrivate, theirPreKeyPublic), and (myOTKeyPrivate, theirPreKeyPublic) if myOTKeyPrivate is provided, then using them all as an input to the HKDF function. This function is only needed when a one-time key is used.

#### createAuthData(senderIdPubKey, receiverIdPubKey)
Creates the AD value used to encrypt message headers by concatenating the public keys for the two parties. This will be removed in later versions in favor of the header keys used in the header encryption mode of Signal Protocol.

#### new DoubleRatchet(sharedKey, myKeypair, theirPublicKey, authData)
Creates a double ratchet which uses sharedKey as the input for the root chain (Diffie-Hellman ratchet).

#### ratchet.init()
Initalizes the sending and receiving message chains (symmetric ratchets). These are not done in the constructor because the forward ratchet function is asynchronous. ratchet.init() only needs to be called when a new ratchet is created, not on deserialization.

#### ratchet.encryptMessage(message)
Returns a promise which will resolve to an encrypted message and message header.

#### ratchet.decryptMessage(cipher)
Returns a promise which will resolve to the decrypted message. This method will automatically determine which message chain and key to use, so it doesn't matter if messages are decrypted in order.

#### ratchet.serialize()
Returns the JSON-encoded ratchet including its root chain and all the current message chains. This can be used to store the ratchet in local storage.

#### DoubleRatchet.deserialize(serialData)
Deserializes the serialized ratchet data and returns a DoubleRatchet object which is ready for use.
