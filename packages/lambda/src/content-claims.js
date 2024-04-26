/* global WritableStream */
import * as Sentry from '@sentry/serverless'
import { createServer, walkClaims } from '@web3-storage/content-claims/server'
import * as CAR from '@ucanto/transport/car'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { S3Client } from '@aws-sdk/client-s3'
import { Config } from 'sst/node/config'
import * as Link from 'multiformats/link'
import * as Digest from 'multiformats/hashes/digest'
import { base58btc } from 'multiformats/bases/base58'
import { CARWriterStream } from 'carstream'
import { getServiceSigner, notNully } from './lib/config.js'
import { DynamoTable } from './lib/store/dynamo-table.js'
import { S3Bucket } from './lib/store/s3-bucket.js'
import { ClaimStorage, TieredClaimFetcher, BlockIndexClaimFetcher } from './lib/store/index.js'

Sentry.AWSLambda.init({
  environment: process.env.SST_STAGE,
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0
})

// @ts-expect-error
const pk = Config.PRIVATE_KEY
const signer = getServiceSigner({ serviceDID: process.env.SERVICE_DID, privateKey: pk })

const text = 'text/plain; charset=utf-8'
const json = 'application/json'

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 */
export const _handler = async event => {
  const { rawPath } = event
  const { method } = event.requestContext.http
  if (method === 'GET') {
    if (rawPath.startsWith('/claims')) {
      return getClaims(event)
    }
    if (rawPath === '/version' || rawPath === '/version/') {
      return getVersion()
    }
    if (rawPath === '/error' || rawPath === '/error/') {
      throw new Error('/error deliberate error')
    }
    if (rawPath === '' || rawPath === '/') {
      return getHome()
    }
    return getNotFound()
  } else if (method === 'POST') {
    if (rawPath === '' || rawPath === '/') {
      return postUcanInvocation(event)
    }
    return getNotFound()
  }
  return { status: 405, headers: { 'Content-Type': text }, body: 'Method Not Allowed' }
}

export const handler = Sentry.AWSLambda.wrapHandler(_handler)

/**
 * Handler for GET /version
 */
export const getVersion = () => {
  const { NAME: name, VERSION: version, COMMIT: commit, STAGE: env, REPO: repo } = process.env
  const did = signer.did()
  const publicKey = signer.toDIDKey()
  const body = JSON.stringify({ name, version, did, publicKey, repo, commit, env })
  return { statusCode: 200, headers: { 'Content-Type': json }, body }
}

/**
 * Handler for GET /
 */
export const getHome = () => {
  const { NAME, VERSION, STAGE, REPO } = process.env
  const env = STAGE === 'prod' ? '' : `(${STAGE})`
  const did = signer.did()
  const publicKey = signer.toDIDKey()
  const body = `⁂ ${NAME} v${VERSION} ${env}\n- ${REPO}\n- ${did}\n- ${publicKey}`
  return { statusCode: 200, headers: { 'Content-Type': text }, body }
}

/**
 * Handler for not found route.
 */
export const getNotFound = () => ({ statusCode: 404, headers: { 'Content-Type': text }, body: '\n 404 🦖 \n' })

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 */
export const postUcanInvocation = async event => {
  if (event.body === undefined) {
    return { statusCode: 400 }
  }

  const dynamoRegion = notNully('CLAIM_TABLE_REGION', process.env)
  const dynamoClient = new DynamoDBClient({ region: dynamoRegion })
  const table = new DynamoTable(dynamoClient, notNully('CLAIM_TABLE', process.env))

  const bucketRegion = notNully('CLAIM_BUCKET_REGION', process.env)
  const bucketClient = new S3Client({ region: bucketRegion })
  const bucket = new S3Bucket(bucketClient, notNully('CLAIM_BUCKET', process.env))

  const claimStore = new ClaimStorage({ table, bucket })

  const server = createServer({
    id: signer,
    codec: CAR.inbound,
    claimStore,
    // TODO: wire into revocations
    // https://github.com/web3-storage/content-claims/issues/32
    validateAuthorization: () => ({ ok: {} })
  })

  const response = await server.request({
    method: event.requestContext.http.method,
    // @ts-expect-error
    headers: event.headers,
    body: Buffer.from(event.body, 'base64')
  })

  return {
    statusCode: response.status ?? 200,
    headers: response.headers,
    body: Buffer.from(response.body).toString('base64'),
    isBase64Encoded: true
  }
}

/**
 * /claims/multihash/:multihash
 * /claims/cid/:cid
 * /claims/:cid - DEPRECATED
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 */
export const getClaims = async event => {
  const dynamoRegion = notNully('CLAIM_TABLE_REGION', process.env)
  const dynamoClient = new DynamoDBClient({ region: dynamoRegion })
  const table = new DynamoTable(dynamoClient, notNully('CLAIM_TABLE', process.env))

  const bucketRegion = notNully('CLAIM_BUCKET_REGION', process.env)
  const bucketClient = new S3Client({ region: bucketRegion })
  const bucket = new S3Bucket(bucketClient, notNully('CLAIM_BUCKET', process.env))

  /** @type {import('@web3-storage/content-claims/server/api').ClaimFetcher} */
  let claimFetcher = new ClaimStorage({ table, bucket })

  if (process.env.BLOCK_INDEX_TABLE) {
    const blkIdxTable = process.env.BLOCK_INDEX_TABLE
    const blkIdxRegion = process.env.BLOCK_INDEX_REGION ?? dynamoRegion
    const blkIdxDynamo = new DynamoDBClient({ region: blkIdxRegion })
    const blkIdxClaimFetcher = new BlockIndexClaimFetcher(blkIdxDynamo, blkIdxTable, signer)
    claimFetcher = new TieredClaimFetcher([claimFetcher, blkIdxClaimFetcher])
  }

  const walkcsv = new URL(`http://localhost${event.rawPath}?${event.rawQueryString}`).searchParams.get('walk')
  const walk = new Set(walkcsv ? walkcsv.split(',') : [])

  const pathParts = event.rawPath.split('/')
  const idType = pathParts[2]
  let digest
  if (idType === 'multihash') {
    digest = Digest.decode(base58btc.decode(pathParts[3]))
  } else if (idType === 'cid') {
    digest = Link.parse(pathParts[3]).multihash
  } else {
    // DEPRECATED /claims/:cid
    digest = Link.parse(idType).multihash
  }

  /** @type {Uint8Array[]} */
  const chunks = []
  await walkClaims({ claimFetcher }, digest, walk)
    .pipeThrough(new CARWriterStream())
    // TODO: stream response
    .pipeTo(new WritableStream({ write: chunk => { chunks.push(chunk) } }))

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/vnd.ipld.car; version=1;' },
    body: Buffer.concat(chunks).toString('base64'),
    isBase64Encoded: true
  }
}
