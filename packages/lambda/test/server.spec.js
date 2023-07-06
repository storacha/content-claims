/* eslint-env browser */
import anyTest from 'ava'
import * as CAR from '@ucanto/transport/car'
import * as ed25519 from '@ucanto/principal/ed25519'
import { mock } from 'node:test'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import * as dagCBOR from '@ipld/dag-cbor'
import * as Client from '@web3-storage/content-claims/client'
import * as Server from '@web3-storage/content-claims/server'
import { Assert } from '@web3-storage/content-claims/capability'
import { InclusionClaimStorage, LocationClaimStorage, PartitionClaimStorage, RelationClaimStorage } from '../src/lib/stores.js'
import { createDynamo, createDynamoTable } from './helpers/aws.js'

/**
 * @typedef {{
 *   inclusionStore: import('@web3-storage/content-claims/store').InclusionClaimStore
 *   locationStore: import('@web3-storage/content-claims/store').LocationClaimStore
 *   partitionStore: import('@web3-storage/content-claims/store').PartitionClaimStore
 *   relationStore: import('@web3-storage/content-claims/store').RelationClaimStore
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
  t.context.inclusionStore = new InclusionClaimStorage(t.context.dynamo.client, await createDynamoTable(t.context.dynamo.client))
  t.context.locationStore = new LocationClaimStorage(t.context.dynamo.client, await createDynamoTable(t.context.dynamo.client))
  t.context.partitionStore = new PartitionClaimStorage(t.context.dynamo.client, await createDynamoTable(t.context.dynamo.client))
  t.context.relationStore = new RelationClaimStorage(t.context.dynamo.client, await createDynamoTable(t.context.dynamo.client))
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

test.after(async t => {
  await t.context.dynamo.container.stop()
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
          content: root.cid,
          child: [child.cid]
        }
      }
    })
    .execute(connection)

  t.falsy(result.out.error)
  t.truthy(result.out.ok)

  t.is(relationPut.mock.callCount(), 1)

  const claim = await t.context.relationStore.get(root.cid)
  t.is(claim?.content.toString(), root.cid.toString())
  t.is(claim?.child.length, 1)
  t.is(claim?.child[0].toString(), child.cid.toString())
})
