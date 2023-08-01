import { UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import * as Link from 'multiformats/link'
import { base32 } from 'multiformats/bases/base32'
import retry from 'p-retry'

/**
 * @typedef {import('@web3-storage/content-claims/server/api').ClaimFetcher} ClaimFetcher
 * @typedef {import('@web3-storage/content-claims/server/api').ClaimStore} ClaimStore
 */

export { TieredClaimFetcher } from './tiered.js'
export { BlockIndexClaimFetcher } from './block-index.js'

/** @implements {ClaimStore} */
export class ClaimStorage {
  /** @type {import('./dynamo-table').DynamoTable} */
  #table
  /** @type {import('./s3-bucket').S3Bucket} */
  #bucket

  /**
   * @param {{
   *   table: import('./dynamo-table').DynamoTable
   *   bucket: import('./s3-bucket').S3Bucket
   * }} config
   */
  constructor ({ table, bucket }) {
    this.#table = table
    this.#bucket = bucket
  }

  /** @param {import('@web3-storage/content-claims/server/api').Claim} claim */
  async put ({ claim, bytes, content, expiration }) {
    const hasExpiration = expiration && isFinite(expiration)
    const cidstr = claim.toString(base32)
    await Promise.all([
      retry(() => {
        const cmd = new PutObjectCommand({
          Bucket: this.#bucket.bucketName,
          Key: `${cidstr}/${cidstr}.car`,
          Body: bytes
        })
        return this.#bucket.s3Client.send(cmd)
      }, {
        minTimeout: 100,
        onFailedAttempt: err => console.warn(`failed S3 put for: ${cidstr}`, err)
      }),
      retry(() => {
        const cmd = new UpdateItemCommand({
          TableName: this.#table.tableName,
          Key: marshall({
            claim: claim.toString(),
            content: content.toV1().toString(base32)
          }),
          ExpressionAttributeValues: hasExpiration ? marshall({ ':ex': expiration }) : undefined,
          UpdateExpression: hasExpiration ? 'SET expiration=:ex' : 'REMOVE expiration'
        })
        return this.#table.dynamoClient.send(cmd)
      }, {
        minTimeout: 100,
        onFailedAttempt: err => console.warn(`failed DynamoDB update for: ${cidstr}`, err)
      })
    ])
  }

  /** @param {import('@ucanto/server').UnknownLink} content */
  async get (content) {
    const cmd = new QueryCommand({
      TableName: this.#table.tableName,
      KeyConditions: {
        content: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [{ S: content.toV1().toString(base32) }]
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
        content: Link.parse(content),
        bytes,
        expiration
      })
    }))
  }
}
