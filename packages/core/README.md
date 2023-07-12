# Content Claims

Implementation of the Content Claims Protocol.

Read the [spec](https://hackmd.io/@gozala/content-claims).

## Install

```sh
npm install @web3-storage/content-claims
```

## Usage

### Client

#### Read claims

```js
import { read } from '@web3-storage/content-claims/client'

// Fetch claims and read them all, returning an array.
const claims = await read(rootCID)

console.log(claims)
```

```js
import { fetch, ClaimReaderStream } from '@web3-storage/content-claims/client'
import { CARReaderStream } from 'carstream'

// Fetch a CAR of claims
const response = await fetch(rootCID)

await response.body
  .pipeThrough(new CARReaderStream()) // bytes in and blocks out
  .pipeThrough(new ClaimReaderStream()) // blocks in and claims out
  .pipeTo(new WritableStream({
    write (claim) {
      console.log(claim)
    }
  }))
```

#### Write claims

```js
import * as Client from '@web3-storage/content-claims/client'
import { Assert } from '@web3-storage/content-claims/capability'

const result = await Assert.partition
  .invoke({
    issuer,
    audience,
    with: 'did:web:claims.web3.storage',
    nb: {
      content: rootCID,
      parts: [partCID]
    },
    expiration: Math.floor((Date.now() / 1000) + 5) // expire in 5 seconds
  })
  .execute(Client.connection)
```

### Server

```js
import { createServer } from '@web3-storage/content-claims/server'
import { Signer } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import http from 'node:http'

const claimStore = {
  async put (claim) { /* ... */ }
  async get (content) { /* ... */ }
  async list (content)  { /* ... */ }
}

const server = createServer({
  id: await Signer.generate(),
  codec: CAR.inbound,
  claimStore
})

http.createServer(async (request, response) => {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(chunk)
  }

  const { headers, body } = await server.request({
    headers: request.headers,
    body: Buffer.concat(chunks),
  })

  response.writeHead(200, headers)
  response.write(body)
  response.end()
}).listen(3000)
```

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/content-claims/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/content-claims/blob/main/LICENSE.md)
