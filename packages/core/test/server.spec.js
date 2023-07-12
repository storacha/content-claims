/* eslint-env browser */
import * as CAR from '@ucanto/transport/car'
import * as ed25519 from '@ucanto/principal/ed25519'
import * as Delegation from '@ucanto/core/delegation'
import { encode as encodeCAR, link as linkCAR } from '@ucanto/core/car'
import { connect } from '@ucanto/client'
import { mock } from 'node:test'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import * as dagCBOR from '@ipld/dag-cbor'
import { Server } from '../src/index.js'
import * as Assert from '../src/capability/assert.js'
import { ClaimStorage } from './helpers/store.js'
import * as CARv2Index from './helpers/carv2-index.js'

const beforeEach = async () => {
  const claimStore = new ClaimStorage()
  const signer = await ed25519.generate()
  const server = Server.createServer({ id: signer, codec: CAR.inbound, claimStore })
  return { claimStore, signer, server }
}

export const test = {
  'should claim relation': async (/** @type {import('entail').assert} */ assert) => {
    const { claimStore, signer, server } = await beforeEach()
    const child = await Block.encode({ value: 'children are great', hasher: sha256, codec: dagCBOR })
    const root = await Block.encode({ value: { child: child.cid }, hasher: sha256, codec: dagCBOR })
    const part = await linkCAR(encodeCAR({ roots: [root], blocks: new Map([[root.toString(), root], [child.toString(), child]]) }))
    const index = await CARv2Index.encode([{ cid: root.cid, offset: 1 }, { cid: child.cid, offset: 2 }])

    const claimPut = mock.method(claimStore, 'put')

    const connection = connect({
      id: signer,
      codec: CAR.outbound,
      channel: server
    })

    const result = await Assert.relation
      .invoke({
        issuer: signer,
        audience: signer,
        with: signer.did(),
        nb: {
          content: root.cid,
          children: [child.cid],
          parts: [{
            content: part,
            includes: index.cid
          }]
        }
      })
      .execute(connection)

    assert.ok(!result.out.error)
    assert.ok(result.out.ok)

    assert.equal(claimPut.mock.callCount(), 1)

    const claim = await claimStore.get(root.cid)
    assert.ok(claim)

    assert.equal(claim.content.toString(), root.cid.toString())
    assert.ok(claim.claim)

    const delegation = await Delegation.extract(claim.bytes)

    /** @type {Assert.AssertRelation|undefined} */
    // @ts-expect-error
    const cap = delegation?.ok?.capabilities[0]

    assert.ok(cap)
    assert.equal(cap.nb.children.length, 1)
    assert.equal(cap.nb.children[0].toString(), child.cid.toString())
  }
}
