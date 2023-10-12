/* eslint-env browser */
import anyTest from 'ava'
import assert from 'node:assert'
import * as CAR from '@ucanto/transport/car'
import * as ed25519 from '@ucanto/principal/ed25519'
import * as Delegation from '@ucanto/core/delegation'
import { encode as encodeCAR, link as linkCAR } from '@ucanto/core/car'
import { mock } from 'node:test'
import * as Block from 'multiformats/block'
import { sha256, sha512 } from 'multiformats/hashes/sha2'
import * as Bytes from 'multiformats/bytes'
import * as dagCBOR from '@ipld/dag-cbor'
import * as dagPB from '@ipld/dag-pb'
import * as Client from '@web3-storage/content-claims/client'
import * as Server from '@web3-storage/content-claims/server'
import { Assert } from '@web3-storage/content-claims/capability'
import { DynamoTable } from '../src/lib/store/dynamo-table.js'
import { S3Bucket } from '../src/lib/store/s3-bucket.js'
import { ClaimStorage } from '../src/lib/store/index.js'
import { createDynamo, createDynamoTable, createS3, createS3Bucket } from './helpers/aws.js'
import * as CARv2Index from './helpers/carv2-index.js'

/**
 * @typedef {{
 *   claimStore: import('@web3-storage/content-claims/server/api').ClaimStore
 *   signer: import('@ucanto/interface').Signer
 *   server: import('@web3-storage/content-claims/server').Server
 *   dynamo: import('./helpers/aws').TestAwsService<import('@aws-sdk/client-dynamodb').DynamoDBClient>
 *   s3: import('./helpers/aws').TestAwsService<import('@aws-sdk/client-s3').S3Client>
 * }} TestContext
 */

const test = /** @type {import('ava').TestFn<TestContext>} */ (anyTest)

test.before(async t => {
  t.context.dynamo = await createDynamo()
  t.context.s3 = await createS3()
})

test.beforeEach(async t => {
  t.context.claimStore = new ClaimStorage({
    table: new DynamoTable(t.context.dynamo.client, await createDynamoTable(t.context.dynamo.client)),
    bucket: new S3Bucket(t.context.s3.client, await createS3Bucket(t.context.s3.client))
  })
  t.context.signer = await ed25519.generate()
  t.context.server = Server.createServer({
    id: t.context.signer,
    codec: CAR.inbound,
    claimStore: t.context.claimStore,
    validateAuthorization: () => ({ ok: {} })
  })
})

test.after(async t => {
  await t.context.dynamo.container.stop()
})

test('should claim relation', async t => {
  const child = await Block.encode({ value: 'children are great', hasher: sha256, codec: dagCBOR })
  const root = await Block.encode({ value: { child: child.cid }, hasher: sha256, codec: dagCBOR })
  const part = await linkCAR(encodeCAR({ roots: [root], blocks: new Map([[root.toString(), root], [child.toString(), child]]) }))
  const index = await CARv2Index.encode([{ cid: root.cid, offset: 1 }, { cid: child.cid, offset: 2 }])

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
        parts: [{
          content: part,
          includes: {
            content: index.cid
          }
        }]
      }
    })
    .execute(connection)

  t.falsy(result.out.error)
  t.truthy(result.out.ok)

  t.is(claimPut.mock.callCount(), 1)

  const [claim] = await t.context.claimStore.get(root.cid)
  assert(claim)

  t.true(Bytes.equals(claim.content.bytes, root.cid.multihash.bytes))
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

test('should be CID version agnostic', async t => {
  const root = await Block.encode({ value: dagPB.prepare(''), hasher: sha256, codec: dagPB })
  const part = await linkCAR(encodeCAR({ roots: [root], blocks: new Map([[root.toString(), root]]) }))

  const claimPut = mock.method(t.context.claimStore, 'put')

  const connection = Client.connect({
    id: t.context.signer,
    codec: CAR.outbound,
    channel: t.context.server
  })

  const result = await Assert.partition
    .invoke({
      issuer: t.context.signer,
      audience: t.context.signer,
      with: t.context.signer.did(),
      nb: {
        content: root.cid.toV0(),
        parts: [part]
      }
    })
    .execute(connection)

  t.falsy(result.out.error)
  t.truthy(result.out.ok)

  t.is(claimPut.mock.callCount(), 1)

  /**
   * Ensure passed claim matches created claim.
   * @param {import('@web3-storage/content-claims/server/api').Claim} claim
   */
  const assertClaim = async claim => {
    t.true(Bytes.equals(claim.content.bytes, root.cid.multihash.bytes))
    assert(claim.claim)

    // ensure `content` in claim is V0 (as created)
    const delegation0 = await Delegation.extract(claim.bytes)

    /** @type {Assert.AssertPartition|undefined} */
    // @ts-expect-error
    const cap0 = delegation0?.ok?.capabilities[0]
    t.is(cap0?.nb.content.version, 0)
    t.is(cap0?.nb.content.toString(), root.cid.toV0().toString())
  }

  // get claim via V1 CID
  const [claim0] = await t.context.claimStore.get(root.cid)
  assert(claim0)
  await assertClaim(claim0)

  // get claim via V0 CID
  const [claim1] = await t.context.claimStore.get(root.cid.toV0())
  assert(claim1)
  await assertClaim(claim1)
})

test('should return equivalence claim for either cid', async t => {
  const value = 'two face'
  const content = await Block.encode({ value, hasher: sha256, codec: dagCBOR })
  const equals = await Block.encode({ value, hasher: sha512, codec: dagCBOR })

  const claimPut = mock.method(t.context.claimStore, 'put')

  const connection = Client.connect({
    id: t.context.signer,
    codec: CAR.outbound,
    channel: t.context.server
  })

  const result = await Assert.equals.invoke({
    issuer: t.context.signer,
    audience: t.context.signer,
    with: t.context.signer.did(),
    nb: {
      content: content.cid,
      equals: equals.cid
    }
  }).execute(connection)

  t.falsy(result.out.error)
  t.truthy(result.out.ok)

  t.is(claimPut.mock.callCount(), 1)

  const [claim] = await t.context.claimStore.get(content.cid)

  const delegation = await Delegation.extract(claim.bytes)

  /** @type {Assert.AssertEquals|undefined} */
  // @ts-expect-error
  const cap = delegation?.ok?.capabilities[0]

  t.truthy(cap)
  assert(cap)
  t.is(cap.nb.content.toString(), content.cid.toString())
  t.is(cap.nb.equals.toString(), equals.cid.toString())

  const [equivalentClaim] = await t.context.claimStore.get(equals.cid)

  t.true(Bytes.equals(claim.bytes, equivalentClaim.bytes))
})
