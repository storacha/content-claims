/* eslint-env browser */
import anyTest from 'ava'
import * as CAR from '@ucanto/transport/car'
import * as ed25519 from '@ucanto/principal/ed25519'
import { mock } from 'node:test'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import * as dagCBOR from '@ipld/dag-cbor'
import { Client, Server } from '../src/index.js'
import * as Assert from '../src/capability/assert.js'
import { InclusionClaimStorage, LocationClaimStorage, PartitionClaimStorage, RelationClaimStorage } from './helpers/stores.js'

/**
 * @typedef {{
 *   inclusionStore: import('../src/store').InclusionClaimStore
 *   locationStore: import('../src/store').LocationClaimStore
 *   partitionStore: import('../src/store').PartitionClaimStore
 *   relationStore: import('../src/store').RelationClaimStore
 *   signer: import('@ucanto/interface').Signer
 *   server: import('../src/server').Server
 * }} TestContext
 */

const test = /** @type {import('ava').TestFn<TestContext>} */ (anyTest)

test.beforeEach(async t => {
  t.context.inclusionStore = new InclusionClaimStorage()
  t.context.locationStore = new LocationClaimStorage()
  t.context.partitionStore = new PartitionClaimStorage()
  t.context.relationStore = new RelationClaimStorage()
  t.context.signer = await ed25519.generate()
  t.context.server = Server.createServer({
    id: t.context.signer,
    codec: CAR.inbound,
    inclusionStore: t.context.inclusionStore,
    locationStore: t.context.locationStore,
    partitionStore: t.context.partitionStore,
    relationStore: t.context.relationStore
  })
})

test('should claim relation', async t => {
  const child = await Block.encode({ value: 'children are great', hasher: sha256, codec: dagCBOR })
  const root = await Block.encode({ value: { child: child.cid }, hasher: sha256, codec: dagCBOR })

  const relationPut = mock.method(t.context.relationStore, 'put')

  const connection = Client.connect({
    id: t.context.signer,
    codec: CAR.outbound,
    channel: t.context.server
  })

  const result = await Client
    .invoke({
      issuer: t.context.signer,
      audience: t.context.signer,
      capability: {
        with: t.context.signer.did(),
        can: Assert.relation.can,
        nb: {
          parent: root.cid,
          child: [child.cid]
        }
      }
    })
    .execute(connection)

  t.falsy(result.out.error)
  t.truthy(result.out.ok)

  t.is(relationPut.mock.callCount(), 1)

  const claim = await t.context.relationStore.get(root.cid)
  t.is(claim?.parent.toString(), root.cid.toString())
  t.is(claim?.child.length, 1)
  t.is(claim?.child[0].toString(), child.cid.toString())
})
