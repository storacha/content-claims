/* global WritableStream, TransformStream */
import { QueryCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import * as Link from 'multiformats/link'
import { base58btc } from 'multiformats/bases/base58'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Digest from 'multiformats/hashes/digest'
import varint from 'varint'
import retry from 'p-retry'
import { MultihashIndexSortedWriter } from 'cardex/multihash-index-sorted'
import { Assert } from '@web3-storage/content-claims/capability'
import { fromString } from 'uint8arrays'
import { DynamoTable } from './dynamo-table.js'

/**
 * @typedef {import('@web3-storage/content-claims/server/api').ClaimFetcher} ClaimFetcher
 */

const CAR_CODE = 0x0202

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
      Limit: 5,
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

    const [item] = (result.Items ?? []).map(item => {
      const { carpath, offset, length } = unmarshall(item)
      const [region, bucket, ...rest] = carpath.split('/')
      return { region, bucket, key: rest.join('/'), offset, length }
    })
    if (!item) return []

    const part = bucketKeyToPartCID(item.key)
    if (!part) return []

    const location = [new URL(`https://${item.bucket}.s3.amazonaws.com/${item.key}`)]
    // offsets are block offsets, not CARv2 index offsets
    const offset = item.offset - (varint.encodingLength(content.bytes.length + item.length) + content.bytes.length)
    const expiration = Math.ceil((Date.now() / 1000) + (60 * 60)) // expire in an hour

    return Promise.all([
      buildLocationClaim(this.#signer, { content, location }, expiration),
      buildRelationClaim(this.#signer, { content, part, offset }, expiration)
    ])
  }
}

/**
 * @param {import('@ucanto/server').Signer} signer
 * @param {{ content: import('@ucanto/server').UnknownLink, location: URL[] }} data
 * @param {number} [expiration]
 */
const buildLocationClaim = (signer, { content, location }, expiration) =>
  buildClaim(content, Assert.location.invoke({
    issuer: signer,
    audience: signer,
    with: signer.did(),
    nb: {
      content,
      // @ts-ignore
      location: location.map(l => l.toString())
    },
    expiration
  }))

/**
 * @param {import('@ucanto/server').Signer} signer
 * @param {{ content: import('multiformats').UnknownLink, part: import('multiformats').Link, offset: number }} data
 * @param {number} [expiration]
 */
const buildRelationClaim = async (signer, { content, part, offset }, expiration) => {
  const index = await encodeIndex(content, offset)
  const invocation = Assert.relation.invoke({
    issuer: signer,
    audience: signer,
    with: signer.did(),
    nb: {
      content,
      children: [],
      parts: [{
        content: part,
        includes: index.cid
      }]
    },
    expiration
  })
  invocation.attach(index)
  return buildClaim(content, invocation)
}

/**
 * @param {import('@ucanto/server').UnknownLink} content
 * @param {import('@ucanto/server').IssuedInvocationView} invocation
 */
const buildClaim = async (content, invocation) => {
  const ipldView = await invocation.buildIPLDView()
  const archive = await ipldView.archive()
  if (!archive.ok) throw new Error('failed to archive invocation', { cause: archive.error })
  return { claim: ipldView.cid, bytes: archive.ok, content, expiration: ipldView.expiration }
}

/**
 * @param {import('@ucanto/server').UnknownLink} content
 * @param {number} offset
 */
const encodeIndex = async (content, offset) => {
  const { writable, readable } = new TransformStream()
  const writer = MultihashIndexSortedWriter.createWriter({ writer: writable.getWriter() })
  writer.add(content, offset)
  writer.close()

  /** @type {Uint8Array[]} */
  const chunks = []
  await readable.pipeTo(new WritableStream({ write: chunk => { chunks.push(chunk) } }))

  const bytes = Buffer.concat(chunks)
  const digest = await sha256.digest(bytes)
  return { cid: Link.create(MultihashIndexSortedWriter.codec, digest), bytes }
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
      const digestBytes = fromString(hash, 'base32')
      const digest = Digest.decode(digestBytes)
      return Link.create(CAR_CODE, digest)
    } catch {}
  }
}
