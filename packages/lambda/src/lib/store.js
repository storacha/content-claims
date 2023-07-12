import { UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import * as Link from 'multiformats/link'

class DynamoDBStorage {
  /** @type {import('@aws-sdk/client-dynamodb').DynamoDBClient} */
  #dynamoClient
  /** @type {string} */
  #tableName

  /**
   * @param {import('@aws-sdk/client-dynamodb').DynamoDBClient} client
   * @param {string} tableName
   */
  constructor (client, tableName) {
    this.#dynamoClient = client
    this.#tableName = tableName
  }

  get dynamoClient () {
    return this.#dynamoClient
  }

  get tableName () {
    return this.#tableName
  }
}

export class ClaimStorage extends DynamoDBStorage {
  /** @param {import('@web3-storage/content-claims/store').Claim} claim */
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
      Limit: 1
    })
    const result = await this.dynamoClient.send(cmd)
    if (!result.Items?.length) return
    return result.Items.map(item => {
      const { claim, bytes, content, expiration } = unmarshall(item)
      return /** @type {import('@web3-storage/content-claims/store').Claim} */ ({
        claim: Link.parse(claim),
        content: Link.parse(content),
        bytes,
        expiration
      })
    })[0]
  }

  /** @param {import('@ucanto/server').UnknownLink} content */
  async list (content) {
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
    const result = await this.dynamoClient.send(cmd)
    if (!result.Items?.length) return []
    return result.Items.map(item => {
      const { claim, bytes, content, expiration } = unmarshall(item)
      return /** @type {import('@web3-storage/content-claims/store').Claim} */ ({
        claim: Link.parse(claim),
        content: Link.parse(content),
        bytes,
        expiration
      })
    })
  }
}
