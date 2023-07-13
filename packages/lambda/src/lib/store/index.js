import { UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import * as Link from 'multiformats/link'
import retry from 'p-retry'
import { DynamoTable } from './dynamo-table.js'

/**
 * @typedef {import('@web3-storage/content-claims/server/api').ClaimFetcher} ClaimFetcher
 * @typedef {import('@web3-storage/content-claims/server/api').ClaimStore} ClaimStore
 */

export { TieredClaimFetcher } from './tiered.js'
export { BlockIndexClaimFetcher } from './block-index.js'

/** @implements {ClaimStore} */
export class ClaimStorage extends DynamoTable {
  /** @param {import('@web3-storage/content-claims/server/api').Claim} claim */
  async put ({ claim, bytes, content, expiration }) {
    const cmd = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({
        claim: claim.toString(),
        content: content.toString()
      }),
      ExpressionAttributeValues: marshall({
        ':by': bytes,
        ':ex': expiration
      }, { removeUndefinedValues: true, convertClassInstanceToMap: true }),
      UpdateExpression: 'SET bytes=if_not_exists(bytes, :by), expiration=if_not_exists(expiration, :ex)'
    })
    await this.dynamoClient.send(cmd)
  }

  /** @param {import('@ucanto/server').UnknownLink} content */
  async get (content) {
    const cmd = new QueryCommand({
      TableName: this.tableName,
      KeyConditions: {
        content: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [{ S: content.toString() }]
        }
      },
      Limit: 100
    })
    const result = await retry(() => this.dynamoClient.send(cmd), {
      minTimeout: 100,
      onFailedAttempt: err => console.warn(`failed DynamoDB query for: ${content}`, err)
    })
    if (!result.Items?.length) return []
    return result.Items.map(item => {
      const { claim, bytes, content, expiration } = unmarshall(item)
      return /** @type {import('@web3-storage/content-claims/server/api').Claim} */ ({
        claim: Link.parse(claim),
        content: Link.parse(content),
        bytes,
        expiration
      })
    })
  }
}
