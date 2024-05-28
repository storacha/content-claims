import { QueryCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import * as Link from 'multiformats/link'
import { base58btc } from 'multiformats/bases/base58'
import { base32 } from 'multiformats/bases/base32'
import * as Digest from 'multiformats/hashes/digest'
import retry from 'p-retry'
import { Assert } from '@web3-storage/content-claims/capability'
import { DynamoTable } from './dynamo-table.js'

/**
 * @typedef {import('@web3-storage/content-claims/server/api').ClaimFetcher} ClaimFetcher
 */

const CAR_CODE = 0x0202
const LIMIT = 25
const BUCKET_URL = `https://carpark-${process.env.STAGE ?? 'dev'}-0.r2.w3s.link`

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

  /** @param {import('@ucanto/server').UnknownLink} content */
  async get (content) {
    const command = new QueryCommand({
      TableName: this.tableName,
      Limit: LIMIT,
      KeyConditions: {
        blockmultihash: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [{ S: base58btc.encode(content.multihash.bytes) }]
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
        let location
        try {
          location = [new URL(carpath)]
        } catch {
          // non-URL is legacy region/bucket/key format
          // e.g. us-west-2/dotstorage-prod-1/raw/bafy...
          const [, , ...rest] = carpath.split('/')
          const key = rest.join('/')
          const part = bucketKeyToPartCID(key)

          // derive location URL(s) from the key
          location = part ? [new URL(`/${part}/${part}.car`, BUCKET_URL)] : []
        }
        return { location, offset, length, derived: true }
      })
      .filter(item => item.location.length)

    // prefer items with non derived location URLs
    let locs = new Map(items.filter(i => !i.derived).map(i => [String(i.location[0]), i]))
    locs = locs.size ? locs : new Map(items.filter(i => i.derived).map(i => [String(i.location[0]), i]))

    const expiration = Math.ceil((Date.now() / 1000) + (60 * 60)) // expire in an hour
    const claims = [...locs.values()].map(l => buildLocationClaim(this.#signer, { content, ...l }, expiration))
    return Promise.all(claims)
  }
}

/**
 * @param {import('@ucanto/server').Signer} signer
 * @param {{ content: import('@ucanto/server').UnknownLink, location: URL[], offset: number, length: number }} data
 * @param {number} [expiration]
 */
const buildLocationClaim = (signer, { content, location, offset, length }, expiration) =>
  buildClaim(content, Assert.location.invoke({
    issuer: signer,
    audience: signer,
    with: signer.did(),
    nb: {
      content,
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
 * @param {import('@ucanto/server').UnknownLink} content
 * @param {import('@ucanto/server').IssuedInvocationView<import('@web3-storage/content-claims/server/service/api').AnyAssertCap>} invocation
 */
const buildClaim = async (content, invocation) => {
  const ipldView = await invocation.buildIPLDView()
  const archive = await ipldView.archive()
  if (!archive.ok) throw new Error('failed to archive invocation', { cause: archive.error })
  return {
    claim: ipldView.cid,
    bytes: archive.ok,
    content: content.multihash,
    expiration: ipldView.expiration,
    value: invocation.capabilities[0]
  }
}

/**
 * Attempts to extract a CAR CID from a bucket key.
 *
 * @param {string} key
 */
const bucketKeyToPartCID = key => {
  const filename = String(key.split('/').at(-1))
  const [hash] = filename.split('.')
  try {
    // recent buckets encode CAR CID in filename
    const cid = Link.parse(hash).toV1()
    if (cid.code === CAR_CODE) return cid
    throw new Error('not a CAR CID')
  } catch (err) {
    // older buckets base32 encode a CAR multihash <base32(car-multihash)>.car
    try {
      const digestBytes = base32.baseDecode(hash)
      const digest = Digest.decode(digestBytes)
      return Link.create(CAR_CODE, digest)
    } catch {}
  }
}
