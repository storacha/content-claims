/* eslint-env browser */
import http from 'node:http'
import { Writable } from 'node:stream'
import * as ed25519 from '@ucanto/principal/ed25519'
import { encode as encodeCAR, link as linkCAR } from '@ucanto/core/car'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Digest from 'multiformats/hashes/digest'
import * as Link from 'multiformats/link'
import * as dagCBOR from '@ipld/dag-cbor'
import { CARWriterStream } from 'carstream'
import { Set as LinkSet } from 'lnset'
import { Client } from '../src/index.js'
import * as Assert from '../src/capability/assert.js'
import { assertDigestEquals } from './helpers/assertions.js'

/** @param {import('multiformats').UnknownLink|{ digest: Uint8Array }} content */
const toDigest = content => 'digest' in content ? Digest.decode(content.digest) : content.multihash

const beforeEach = async () => {
  const signer = await ed25519.generate()
  return { signer }
}

export const test = {
  'should read claims': async (/** @type {import('entail').assert} */ assert) => {
    const { signer } = await beforeEach()
    const child = await Block.encode({ value: 'children are great', hasher: sha256, codec: dagCBOR })
    const root = await Block.encode({ value: { child: child.cid }, hasher: sha256, codec: dagCBOR })
    const part = await linkCAR(encodeCAR({ roots: [root], blocks: new Map([[root.toString(), root], [child.toString(), child]]) }))

    const partitionClaim = Assert.partition.invoke({
      issuer: signer,
      audience: signer,
      with: signer.did(),
      nb: {
        content: root.cid,
        blocks: await new LinkSet([root.cid, child.cid]).link(),
        parts: [part]
      }
    })
    const locationClaim = Assert.location.invoke({
      issuer: signer,
      audience: signer,
      with: signer.did(),
      nb: {
        content: root.cid,
        location: [
          /** @type {import('@ucanto/interface').URI<'https:'>} */
          (`https://w3s.link/ipfs/${root.cid}`)
        ]
      }
    })

    const claims = [partitionClaim, locationClaim]

    const server = http.createServer((_, res) => {
      const readable = new ReadableStream({
        async pull (controller) {
          for (const claim of claims) {
            const view = await claim.buildIPLDView()
            const bytes = await view.archive()
            if (bytes.error) throw bytes.error
            controller.enqueue({
              cid: Link.create(0x0202, await sha256.digest(bytes.ok)),
              bytes: bytes.ok
            })
          }
          controller.close()
        }
      })
      readable.pipeThrough(new CARWriterStream()).pipeTo(Writable.toWeb(res))
    })
    await new Promise(resolve => server.listen(resolve))
    // @ts-expect-error
    const serviceURL = new URL(`http://127.0.0.1:${server.address().port}`)

    const out = await Client.read(root.cid.multihash, { serviceURL })
    const partitionClaims = []
    const locationClaims = []
    for (const claim of out) {
      if (claim.type === Assert.partition.can) {
        partitionClaims.push(claim)
      } else if (claim.type === Assert.location.can) {
        locationClaims.push(claim)
      } else {
        assert.fail(`unexpected claim type: ${claim.type}`)
      }
    }
    assert.equal(partitionClaims.length, 1)
    assertDigestEquals(partitionClaims[0].content, toDigest(partitionClaim.capabilities[0].nb.content))
    assert.equal(partitionClaims[0].blocks?.toString(), partitionClaim.capabilities[0].nb.blocks?.toString())
    assert.equal(partitionClaims[0].parts.map(p => p.toString()).toString(), partitionClaim.capabilities[0].nb.parts.map(p => p.toString()).toString())

    assert.equal(locationClaims.length, 1)
    assertDigestEquals(locationClaims[0].content, toDigest(locationClaim.capabilities[0].nb.content))
    assert.equal(locationClaims[0].location[0], locationClaim.capabilities[0].nb.location[0])
  },

  'should decode a claim': async (/** @type {import('entail').assert} */ assert) => {
    const { signer } = await beforeEach()
    const child = await Block.encode({ value: 'children are great', hasher: sha256, codec: dagCBOR })
    const root = await Block.encode({ value: { child: child.cid }, hasher: sha256, codec: dagCBOR })
    const part = await linkCAR(encodeCAR({ roots: [root], blocks: new Map([[root.toString(), root], [child.toString(), child]]) }))

    const partitionClaim = Assert.partition.invoke({
      issuer: signer,
      audience: signer,
      with: signer.did(),
      nb: {
        content: root.cid,
        parts: [part]
      }
    })
    const view = await partitionClaim.buildIPLDView()
    const bytes = await view.archive()
    assert.ok(bytes.ok)

    const decoded = await Client.decode(bytes.ok)
    assertDigestEquals(decoded.content, root.cid.multihash)
  }
}
