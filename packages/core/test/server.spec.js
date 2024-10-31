/* eslint-env browser */
import * as CAR from '@ucanto/transport/car'
import * as ed25519 from '@ucanto/principal/ed25519'
import * as Delegation from '@ucanto/core/delegation'
import { connect } from '@ucanto/client'
import { mock } from 'node:test'
import * as Block from 'multiformats/block'
import { sha256, sha512 } from 'multiformats/hashes/sha2'
import * as Bytes from 'multiformats/bytes'
import * as Link from 'multiformats/link'
import * as dagCBOR from '@ipld/dag-cbor'
import * as BlobIndexUtil from '@web3-storage/blob-index/util'
import { Server } from '../src/index.js'
import * as Assert from '../src/capability/assert.js'
import { ClaimStorage } from './helpers/store.js'
import * as Result from './helpers/result.js'

const beforeEach = async () => {
  const claimStore = new ClaimStorage()
  const signer = await ed25519.generate()
  const server = Server.createServer({
    id: signer,
    codec: CAR.inbound,
    claimStore,
    validateAuthorization: () => ({ ok: {} })
  })
  return { claimStore, signer, server }
}

export const test = {
  'should claim equals': async (/** @type {import('entail').assert} */ assert) => {
    const { claimStore, signer, server } = await beforeEach()
    const value = 'two face'
    const content = await Block.encode({ value, hasher: sha256, codec: dagCBOR })
    const equals = await Block.encode({ value, hasher: sha512, codec: dagCBOR })

    const claimPut = mock.method(claimStore, 'put')

    const connection = connect({
      id: signer,
      codec: CAR.outbound,
      channel: server
    })

    const result = await Assert.equals
      .invoke({
        issuer: signer,
        audience: signer,
        with: signer.did(),
        nb: {
          content: content.cid,
          equals: equals.cid
        }
      })
      .execute(connection)

    assert.ok(!result.out.error)
    assert.ok(result.out.ok)

    assert.equal(claimPut.mock.callCount(), 1)

    const [claim] = await claimStore.get(content.cid.multihash)
    assert.ok(claim)

    assert.ok(Bytes.equals(claim.content.bytes, content.cid.multihash.bytes))
    assert.ok(claim.claim)

    const delegation = await Delegation.extract(claim.bytes)

    const cap =
      /** @type {import('../types/capability/api.js').AssertEquals} */
      (delegation?.ok?.capabilities[0])

    assert.ok(cap)
    assert.equal(cap.nb.equals.toString(), equals.cid.toString())
  },

  'should claim index': async (/** @type {import('entail').assert} */ assert) => {
    const { claimStore, signer, server } = await beforeEach()

    const content = await Block.encode({ value: 'index me', hasher: sha256, codec: dagCBOR })
    const car = CAR.codec.encode({ roots: [content] })

    const index = await BlobIndexUtil.fromShardArchives(content.cid, [car])
    const indexBytes = Result.unwrap(await index.archive())
    const indexLink = Link.create(CAR.codec.code, await sha256.digest(indexBytes))

    const connection = connect({
      id: signer,
      codec: CAR.outbound,
      channel: server
    })

    const result = await Assert.index
      .invoke({
        issuer: signer,
        audience: signer,
        with: signer.did(),
        nb: {
          content: content.cid,
          index: indexLink
        }
      })
      .execute(connection)

    assert.ok(!result.out.error)
    assert.ok(result.out.ok)

    const [claim] = await claimStore.get(content.cid.multihash)
    assert.ok(claim)

    assert.ok(Bytes.equals(claim.content.bytes, content.cid.multihash.bytes))
    assert.ok(claim.claim)

    const delegation = await Delegation.extract(claim.bytes)

    const cap =
      /** @type {import('../types/capability/api.js').AssertIndex} */
      (delegation?.ok?.capabilities[0])

    assert.ok(cap)
    assert.equal(cap.nb.index.toString(), indexLink.toString())
  },

  'should claim location': async (/** @type {import('entail').assert} */ assert) => {
    const { claimStore, signer, server } = await beforeEach()

    const content = await Block.encode({ value: 'find me', hasher: sha256, codec: dagCBOR })
    const car = CAR.codec.encode({ roots: [content] })
    const carBlock = await Block.encode({ value: car, hasher: sha256, codec: CAR.codec })

    const connection = connect({
      id: signer,
      codec: CAR.outbound,
      channel: server
    })

    const result = await Assert.location
      .invoke({
        issuer: signer,
        audience: signer,
        with: signer.did(),
        nb: {
          content: { digest: carBlock.cid.multihash.bytes },
          location: ['http://localhost:3000/']
        }
      })
      .execute(connection)

    assert.ok(!result.out.error)
    assert.ok(result.out.ok)

    const [claim] = await claimStore.get(carBlock.cid.multihash)
    assert.ok(claim)

    assert.ok(Bytes.equals(claim.content.bytes, carBlock.cid.multihash.bytes))
    assert.ok(claim.claim)

    const delegation = await Delegation.extract(claim.bytes)

    const cap =
      /** @type {import('../types/capability/api.js').AssertLocation} */
      (delegation?.ok?.capabilities[0])

    assert.ok(cap)
    assert.equal(cap.nb.location.toString(), 'http://localhost:3000/')
  }
}
