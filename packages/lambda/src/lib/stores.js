import { BatchGetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'

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

export class LocationClaimStorage extends DynamoDBStorage {
  /** @param {import('@web3-storage/content-claims/store').LocationClaim} claim */
  async put ({ content, location, range }) {
    const cmd = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        content: content.toString(),
        location: location.toString(),
        range
      }, { removeUndefinedValues: true })
    })
    await this.dynamoClient.send(cmd)
  }

  async getMany (contents) {
    const cmd = new BatchGetItemCommand({
      RequestItems: {
        [this.tableName]: {
          Keys: contents.map(c => marshall({  }))
        }
      }
    })
    await this.dynamoClient.send(cmd)
  }
}

export class InclusionClaimStorage extends DynamoDBStorage {
  /** @param {import('@web3-storage/content-claims/store').InclusionClaim} claim */
  async put ({ content, includes, proof }) {
    const cmd = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        content: content.toString(),
        includes: includes.toString(),
        proof: proof ? proof.toString() : undefined
      }, { removeUndefinedValues: true })
    })
    await this.dynamoClient.send(cmd)
  }
}

export class PartitionClaimStorage extends DynamoDBStorage {
  /** @param {import('@web3-storage/content-claims/store').PartitionClaim} claim */
  async put ({ content, blocks, parts }) {
    const cmd = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        content: content.toString(),
        blocks: blocks ? blocks.toString() : undefined,
        parts: parts.map(p => p.toString())
      }, { removeUndefinedValues: true })
    })
    await this.dynamoClient.send(cmd)
  }
}

export class RelationClaimStorage extends DynamoDBStorage {
  /** @param {import('@web3-storage/content-claims/store').RelationClaim} claim */
  async put ({ parent, child }) {
    const cmd = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall({
        parent: parent.toString(),
        child: child.map(c => c.toString())
      }, { removeUndefinedValues: true })
    })
    await this.dynamoClient.send(cmd)
  }
}

export class BlocklyStorage extends DynamoDBStorage {
  /** @type {import('@web3-storage/content-claims/store').PartitionClaimStore} */
  #partitionStore
  /** @type {import('@web3-storage/content-claims/store').LocationClaimStore} */
  #locationStore

  /**
   * @param {import('@aws-sdk/client-dynamodb').DynamoDBClient} client
   * @param {string} tableName
   * @param {import('@web3-storage/content-claims/store').PartitionClaimStore} partitionStore
   * @param {import('@web3-storage/content-claims/store').LocationClaimStore} locationStore
   */
  constructor (client, tableName, partitionStore, locationStore) {
    super(client, tableName)
    this.#partitionStore = partitionStore
    this.#locationStore = locationStore
  }

  /** @param {import('@web3-storage/content-claims/store').PartitionClaim} claim */
  async put ({ content, blocks, parts }) {
    await this.#partitionStore.put({ content, blocks, parts })

    const locations = await this.#locationStore.getMany(parts)

  }
}
