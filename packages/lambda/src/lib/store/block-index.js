import { QueryCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import { base58btc } from 'multiformats/bases/base58'
import retry from 'p-retry'
import { Assert } from '@web3-storage/content-claims/capability'
import { DynamoTable } from './dynamo-table.js'

/**
 * @typedef {import('@web3-storage/content-claims/server/api').ClaimFetcher} ClaimFetcher
 */

const LIMIT = 10

/**
 * Materializes claims on demand using block indexes stored in DynamoDB.
 *
 * @implements {ClaimFetcher}
 */
export class BlockIndexClaimFetcher extends DynamoTable {
  #signer

  /**
   * @param {import('@aws-sdk/client-dynamodb').DynamoDBClient} client
   * @param {string} tableName
   * @param {import('@ucanto/server').Signer} signer
   */
  constructor (client, tableName, signer) {
    super(client, tableName)
    this.#signer = signer
  }

  /** @param {import('@ucanto/server').MultihashDigest} content */
  async get (content) {
    const command = new QueryCommand({
      TableName: this.tableName,
      Limit: LIMIT,
      KeyConditions: {
        blockmultihash: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [{ S: base58btc.encode(content.bytes) }]
        }
      },
      AttributesToGet: ['carpath', 'length', 'offset']
    })

    const result = await retry(() => this.dynamoClient.send(command), {
      minTimeout: 100,
      onFailedAttempt: err => console.warn(`failed DynamoDB query for: ${content}`, err)
    })

    const items = (result.Items ?? [])
      .map(item => {
        const { carpath, offset, length } = unmarshall(item)
        const [region, bucket, ...rest] = carpath.split('/')
        return { region, bucket, key: rest.join('/'), offset, length }
      })

    // TODO: remove when all content is copied over to R2
    let item = items.find(({ bucket }) => bucket === 'carpark-prod-0')
    item = item ?? items.find(({ bucket, key }) => bucket === 'dotstorage-prod-1' && key.startsWith('raw'))
    item = item ?? items.find(({ bucket, key }) => bucket === 'dotstorage-prod-0' && key.startsWith('raw'))
    item = item ?? items[0]
    if (!item) return []

    const location = [new URL(`https://${item.bucket}.s3.amazonaws.com/${item.key}`)]
    const expiration = Math.ceil((Date.now() / 1000) + (60 * 60)) // expire in an hour
    const claims = [buildLocationClaim(this.#signer, { content, location, ...item }, expiration)]
    return Promise.all(claims)
  }
}

/**
 * @param {import('@ucanto/server').Signer} signer
 * @param {{ content: import('@ucanto/server').MultihashDigest, location: URL[], offset: number, length: number }} data
 * @param {number} [expiration]
 */
const buildLocationClaim = (signer, { content, location, offset, length }, expiration) =>
  buildClaim(content, Assert.location.invoke({
    issuer: signer,
    audience: signer,
    with: signer.did(),
    nb: {
      content: { digest: content.bytes },
      // @ts-ignore
      location: location.map(l => l.toString()),
      range: {
        offset,
        length
      }
    },
    expiration
  }))

/**
 * @param {import('@ucanto/server').MultihashDigest} content
 * @param {import('@ucanto/server').IssuedInvocationView<import('@web3-storage/content-claims/server/service/api').AnyAssertCap>} invocation
 */
const buildClaim = async (content, invocation) => {
  const ipldView = await invocation.buildIPLDView()
  const archive = await ipldView.archive()
  if (!archive.ok) throw new Error('failed to archive invocation', { cause: archive.error })
  return {
    claim: ipldView.cid,
    bytes: archive.ok,
    content,
    expiration: ipldView.expiration,
    value: invocation.capabilities[0]
  }
}
