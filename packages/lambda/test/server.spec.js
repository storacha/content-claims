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
import * as Digest from 'multiformats/hashes/digest'
import { base58btc } from 'multiformats/bases/base58'
import * as Bytes from 'multiformats/bytes'
import { CarIndexer } from '@ipld/car/indexer'
import * as dagCBOR from '@ipld/dag-cbor'
import * as Client from '@web3-storage/content-claims/client'
import * as Server from '@web3-storage/content-claims/server'
import { Assert } from '@web3-storage/content-claims/capability'
import { PutItemCommand } from '@aws-sdk/client-dynamodb'
import { convertToAttr } from '@aws-sdk/util-dynamodb'
import { DynamoTable } from '../src/lib/store/dynamo-table.js'
import { S3Bucket } from '../src/lib/store/s3-bucket.js'
import { BUCKET_URL, bucketKeyToPartCID } from '../src/lib/store/block-index.js'
import { ClaimStorage, BlockIndexClaimFetcher } from '../src/lib/store/index.js'
import { createDynamo, createDynamoTable, createDynamoBlocksTable, createS3, createS3Bucket } from './helpers/aws.js'
import * as CARv2Index from './helpers/carv2-index.js'
import { assertDigestEquals } from './helpers/assertions.js'

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

/** @param {import('multiformats').UnknownLink|{ digest: Uint8Array }} content */
const toDigest = content => 'digest' in content ? Digest.decode(content.digest) : content.multihash

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

  const [claim] = await t.context.claimStore.get(root.cid.multihash)
  assert(claim)

  t.true(Bytes.equals(claim.content.bytes, root.cid.multihash.bytes))
  assert(claim.claim)

  const delegation = await Delegation.extract(claim.bytes)

  const cap =
    /** @type {import('@web3-storage/content-claims/capability/api').AssertRelation} */
    (delegation?.ok?.capabilities[0])

  t.truthy(cap)
  assert(cap)
  t.is(cap.nb.children.length, 1)
  t.is(cap.nb.children[0].toString(), child.cid.toString())
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

  const [claim] = await t.context.claimStore.get(content.cid.multihash)

  const delegation = await Delegation.extract(claim.bytes)

  const cap =
    /** @type {import('@web3-storage/content-claims/capability/api').AssertEquals} */
    (delegation?.ok?.capabilities[0])

  t.truthy(cap)
  t.is(cap.nb.content.toString(), content.cid.toString())
  t.is(cap.nb.equals.toString(), equals.cid.toString())

  const [equivalentClaim] = await t.context.claimStore.get(equals.cid.multihash)

  t.true(Bytes.equals(claim.bytes, equivalentClaim.bytes))
})

test('should materialize location claim from /raw block index', async t => {
  const { signer } = t.context
  const dynamo = t.context.dynamo.client
  const root = await Block.encode({ value: 'go go go', hasher: sha256, codec: dagCBOR })
  const car = encodeCAR({ roots: [root], blocks: new Map([[root.cid.toString(), root]]) })
  const carCid = await linkCAR(car)
  const carpath = `region/bucket/raw/root/uid/${base32.baseEncode(carCid.multihash.bytes)}.car`
  const indexer = await CarIndexer.fromBytes(car)
  const index = new Map()
  for await (const { cid, offset, blockOffset, blockLength } of indexer) {
    index.set(cid.toString(), { cid, offset, blockOffset, blockLength })
  }
  const offset = index.get(root.cid.toString()).blockOffset
  const blocksTable = await createDynamoBlocksTable(dynamo)
  await dynamo.send(new PutItemCommand({
    TableName: blocksTable,
    Item: {
      blockmultihash: convertToAttr(base58btc.encode(root.cid.multihash.bytes)),
      carpath: convertToAttr(carpath),
      offset: convertToAttr(offset),
      length: convertToAttr(root.bytes.byteLength)
    }
  }))

  const blockClaims = new BlockIndexClaimFetcher(dynamo, blocksTable, signer)
  const res = await blockClaims.get(root.cid.multihash)
  t.is(res.length, 1)

  const value =
    /** @type {import('@web3-storage/content-claims/capability/api').AssertLocation} */
    (res[0].value)

  t.is(value.can, 'assert/location')
  t.is(value.with, signer.did())
  assertDigestEquals(toDigest(value.nb.content), root.cid.multihash)
  t.like(value.nb.range, { offset, length: root.bytes.byteLength })
  const [, , ...key] = carpath.split('/')
  const part = bucketKeyToPartCID(key.join('/'))
  const url = new URL(`/${part}/${part}.car`, BUCKET_URL)
  t.true(value.nb.location.includes(url.toString()))

  const blockBytes = car.subarray(offset, offset + root.bytes.byteLength)
  t.true(Bytes.equals(blockBytes, root.bytes), 'offset was correctly derived')
}
