import { UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import * as Link from 'multiformats/link'
import * as Multihash from 'multiformats/hashes/digest'
import { base32 } from 'multiformats/bases/base32'
import { base58btc } from 'multiformats/bases/base58'
import * as Bytes from 'multiformats/bytes'
import retry from 'p-retry'

/**
 * @typedef {{ dynamoClient: import('@aws-sdk/client-dynamodb').DynamoDBClient, tableName: string }} Table
 * @typedef {{ s3Client: import('@aws-sdk/client-s3').S3Client, bucketName: string }} Bucket
 * @typedef {import('@web3-storage/content-claims/server/api').ClaimFetcher} ClaimFetcher
 * @typedef {import('@web3-storage/content-claims/server/api').ClaimStore} ClaimStore
 */

export { BlockIndexClaimFetcher } from './block-index.js'

/**
 * Properties for DynamoDB claims table.
 * @type {import('sst/constructs').TableProps}
 */
export const tableProps = {
  fields: {
    claim: 'string',
    content: 'string',
    expiration: 'number'
  },
  primaryIndex: { partitionKey: 'content', sortKey: 'claim' },
  timeToLiveAttribute: 'expiration'
}

/** @implements {ClaimStore} */
export class ClaimStorage {
  /** @type {Table} */
  #table
  /** @type {Bucket} */
  #bucket

  /** @param {{ table: Table, bucket: Bucket }} config */
  constructor ({ table, bucket }) {
    this.#table = table
    this.#bucket = bucket
  }

  /** @param {import('@web3-storage/content-claims/server/api').Claim} claim */
  async put (claim) {
    await Promise.all([
      storeClaimBytes(claim, this.#bucket),
      upsertClaim(claim, this.#table),
      maybeUpsertEquivalentClaim(claim, this.#table)
    ])
  }

  /** @param {import('@ucanto/server').MultihashDigest} content */
  async get (content) {
    const cmd = new QueryCommand({
      TableName: this.#table.tableName,
      KeyConditions: {
        content: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [{ S: base58btc.encode(content.bytes) }]
        }
      },
      Limit: 100
    })
    const result = await this.#table.dynamoClient.send(cmd)
    if (!result.Items?.length) return []

    return Promise.all(result.Items.map(async item => {
      const { claim, content, expiration } = unmarshall(item)
      const cidstr = claim.toString(base32)
      const cmd = new GetObjectCommand({
        Bucket: this.#bucket.bucketName,
        Key: `${cidstr}/${cidstr}.car`
      })
      const bytes = await retry(async () => {
        const res = await this.#bucket.s3Client.send(cmd)
        if (!res.Body) throw new Error('missing object body')
        return res.Body.transformToByteArray()
      }, {
        minTimeout: 100,
        onFailedAttempt: err => console.warn(`failed S3 get for: ${cidstr}`, err)
      })
      return /** @type {import('@web3-storage/content-claims/server/api').Claim} */ ({
        claim: Link.parse(claim),
        content: Multihash.decode(base58btc.decode(content)),
        bytes,
        expiration
      })
    }))
  }
}

/**
 * @param {import('@web3-storage/content-claims/server/api').Claim} claim
 * @param {Bucket} s3
 **/
async function storeClaimBytes ({ claim, bytes }, { bucketName, s3Client }) {
  const cidstr = claim.toString(base32)
  const key = `${cidstr}/${cidstr}.car`
  return retry(() => {
    const cmd = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: bytes
    })
    return s3Client.send(cmd)
  }, {
    minTimeout: 100,
    onFailedAttempt: err => console.warn(`failed S3 put for: ${cidstr}`, err)
  })
}

/**
 * @param {import('@web3-storage/content-claims/server/api').Claim} claim
 * @param {Table} dynamo
 */
async function upsertClaim ({ claim, content, expiration }, { tableName, dynamoClient }) {
  const hasExpiration = expiration && isFinite(expiration)
  const mh = base58btc.encode(content.bytes)
  return retry(() => {
    const cmd = new UpdateItemCommand({
      TableName: tableName,
      Key: marshall({
        claim: claim.toString(base32),
        content: mh
      }),
      ExpressionAttributeValues: marshall({ ':ex': hasExpiration ? expiration : 0 }),
      UpdateExpression: 'SET expiration=:ex'
    })
    return dynamoClient.send(cmd)
  }, {
    minTimeout: 100,
    onFailedAttempt: err => console.warn(`failed DynamoDB update for content: ${mh} claim: ${claim.toString(base32)}`, err)
  })
}

/**
 * @param {import('@web3-storage/content-claims/server/api').Claim} claim
 * @param {Table} dynamo
 */
async function maybeUpsertEquivalentClaim (claim, dynamo) {
  const { content, value } = claim
  if (value.can === 'assert/equals') {
    const equivalent = value.nb.equals.multihash
    // If the multihash matches this claim will appear in queries for either CID already.
    if (!Bytes.equals(content.bytes, equivalent.bytes)) {
      // add claim with the `equals` cid as the `content` cid, so we can
      // provide the equivalent claim for look ups for either.
      return upsertClaim({ ...claim, content: equivalent }, dynamo)
    }
  }
}
