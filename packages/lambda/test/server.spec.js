/* eslint-env browser */
import anyTest from 'ava'
import assert from 'node:assert'
import * as CAR from '@ucanto/transport/car'
import * as ed25519 from '@ucanto/principal/ed25519'
import * as Delegation from '@ucanto/core/delegation'
import { encode as encodeCAR, link as linkCAR } from '@ucanto/core/car'
import { mock } from 'node:test'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import * as dagCBOR from '@ipld/dag-cbor'
import * as Client from '@web3-storage/content-claims/client'
import * as Server from '@web3-storage/content-claims/server'
import { Assert } from '@web3-storage/content-claims/capability'
import { ClaimStorage } from '../src/lib/store.js'
import { createDynamo, createDynamoTable } from './helpers/aws.js'

/**
 * @typedef {{
 *   claimStore: import('@web3-storage/content-claims/store').ClaimStore
 *   signer: import('@ucanto/interface').Signer
 *   server: import('@web3-storage/content-claims/server').Server
 *   dynamo: import('./helpers/aws').TestAwsService<import('@aws-sdk/client-dynamodb').DynamoDBClient>
 * }} TestContext
 */

const test = /** @type {import('ava').TestFn<TestContext>} */ (anyTest)

test.before(async t => {
  t.context.dynamo = await createDynamo()
})

test.beforeEach(async t => {
  t.context.claimStore = new ClaimStorage(t.context.dynamo.client, await createDynamoTable(t.context.dynamo.client))
  t.context.signer = await ed25519.generate()
  t.context.server = Server.createServer({
    id: t.context.signer,
    codec: CAR.inbound,
    claimStore: t.context.claimStore
  })
})

test.after(async t => {
  await t.context.dynamo.container.stop()
})

test('should claim relation', async t => {
  const child = await Block.encode({ value: 'children are great', hasher: sha256, codec: dagCBOR })
  const root = await Block.encode({ value: { child: child.cid }, hasher: sha256, codec: dagCBOR })
  const part = await linkCAR(encodeCAR({ roots: [root], blocks: new Map([[root.toString(), root], [child.toString(), child]]) }))

  const claimPut = mock.method(t.context.claimStore, 'put')

  const connection = Client.connect({
    id: t.context.signer,
    codec: CAR.outbound,
    channel: t.context.server
  })

  const result = await Assert.relation
    .invoke({
      issuer: t.context.signer,
      audience: t.context.signer,
      with: t.context.signer.did(),
      nb: {
        content: root.cid,
        children: [child.cid],
        parts: [part]
      }
    })
    .execute(connection)

  t.falsy(result.out.error)
  t.truthy(result.out.ok)

  t.is(claimPut.mock.callCount(), 1)

  const claim = await t.context.claimStore.get(root.cid)
  assert(claim)

  t.is(claim.content.toString(), root.cid.toString())
  assert(claim.claim)

  const delegation = await Delegation.extract(claim.bytes)

  /** @type {Assert.AssertRelation|undefined} */
  // @ts-expect-error
  const cap = delegation?.ok?.capabilities[0]

  t.truthy(cap)
  assert(cap)
  t.is(cap.nb.children.length, 1)
  t.is(cap.nb.children[0].toString(), child.cid.toString())
})
