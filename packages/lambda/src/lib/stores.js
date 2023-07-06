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

export class LocationClaimStorage extends DynamoDBStorage {
  /** @param {import('@web3-storage/content-claims/store').LocationClaim} claim */
  async put ({ invocation, content, location, range }) {
    const cmd = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({
        invocation: invocation.toString(),
        content: content.toString()
      }),
      ExpressionAttributeValues: marshall({
        ':ls': new Set(location.map(l => l.toString())),
        ':ra': range
      }, { removeUndefinedValues: true, convertClassInstanceToMap: true }),
      UpdateExpression: `SET location=if_not_exists(location, :ls)${range ? ', range = if_not_exists(range, :ra)' : ''}`
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
      const { invocation, content, location, range } = unmarshall(item)
      return /** @type {import('@web3-storage/content-claims/store').LocationClaim} */ ({
        invocation: Link.parse(invocation),
        content: Link.parse(content),
        location: [...location].map((/** @type {string} */ url) => new URL(url)),
        range
      })
    })[0]
  }
}

export class InclusionClaimStorage extends DynamoDBStorage {
  /** @param {import('@web3-storage/content-claims/store').InclusionClaim} claim */
  async put ({ invocation, content, includes, proof }) {
    const cmd = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({
        invocation: invocation.toString(),
        content: content.toString()
      }),
      ExpressionAttributeValues: marshall({
        ':in': includes.toString(),
        ':pr': proof ? proof.toString() : undefined
      }, { removeUndefinedValues: true }),
      UpdateExpression: `SET includes=if_not_exists(includes, :in)${proof ? ', proof = if_not_exists(proof, :pr)' : ''}`
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
      const { invocation, content, includes, proof } = unmarshall(item)
      return /** @type {import('@web3-storage/content-claims/store').InclusionClaim} */ ({
        invocation: Link.parse(invocation),
        content: Link.parse(content),
        includes: Link.parse(includes),
        proof: proof ? Link.parse(proof) : undefined
      })
    })[0]
  }
}

export class PartitionClaimStorage extends DynamoDBStorage {
  /** @param {import('@web3-storage/content-claims/store').PartitionClaim} claim */
  async put ({ invocation, content, blocks, parts }) {
    const cmd = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({
        invocation: invocation.toString(),
        content: content.toString()
      }),
      ExpressionAttributeValues: marshall({
        ':pa': parts.map(p => p.toString()),
        ':bl': blocks ? blocks.toString() : undefined
      }, { removeUndefinedValues: true }),
      UpdateExpression: `SET parts=if_not_exists(parts, :pa)${blocks ? ', blocks = if_not_exists(blocks, :bl)' : ''}`
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
      const { invocation, content, parts, blocks } = unmarshall(item)
      return /** @type {import('@web3-storage/content-claims/store').PartitionClaim} */ ({
        invocation: Link.parse(invocation),
        content: Link.parse(content),
        parts: [...parts].map(p => Link.parse(p)),
        blocks: blocks ? Link.parse(blocks) : undefined
      })
    })[0]
  }
}

export class RelationClaimStorage extends DynamoDBStorage {
  /** @param {import('@web3-storage/content-claims/store').RelationClaim} claim */
  async put ({ invocation, content, child }) {
    const cmd = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({
        invocation: invocation.toString(),
        content: content.toString()
      }),
      ExpressionAttributeValues: marshall({ ':ch': child.map(c => c.toString()) }),
      UpdateExpression: 'SET child=if_not_exists(child, :ch)'
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
      const { invocation, content, child } = unmarshall(item)
      return /** @type {import('@web3-storage/content-claims/store').RelationClaim} */ ({
        invocation: Link.parse(invocation),
        content: Link.parse(content),
        child: [...child].map(c => Link.parse(c))
      })
    })[0]
  }
}

// export class BlocklyStorage extends DynamoDBStorage {
//   /** @type {import('@web3-storage/content-claims/store').PartitionClaimStore} */
//   #partitionStore
//   /** @type {import('@web3-storage/content-claims/store').LocationClaimStore} */
//   #locationStore

//   /**
//    * @param {import('@aws-sdk/client-dynamodb').DynamoDBClient} client
//    * @param {string} tableName
//    * @param {import('@web3-storage/content-claims/store').PartitionClaimStore} partitionStore
//    * @param {import('@web3-storage/content-claims/store').LocationClaimStore} locationStore
//    */
//   constructor (client, tableName, partitionStore, locationStore) {
//     super(client, tableName)
//     this.#partitionStore = partitionStore
//     this.#locationStore = locationStore
//   }

//   /** @param {import('@web3-storage/content-claims/store').PartitionClaim} claim */
//   async put ({ content, blocks, parts }) {
//     await this.#partitionStore.put({ content, blocks, parts })

//     const locations = await this.#locationStore.getMany(parts)

//   }
// }
