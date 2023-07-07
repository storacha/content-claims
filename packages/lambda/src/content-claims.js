import * as Sentry from '@sentry/serverless'
import { createServer } from '@web3-storage/content-claims/server'
import * as CAR from '@ucanto/transport/car'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { Config } from 'sst/node/config'
import * as dagJSON from '@ipld/dag-json'
import * as Link from 'multiformats/link'
import { getServiceSigner, notNully } from './lib/config.js'
import { InclusionClaimStorage, LocationClaimStorage, PartitionClaimStorage, RelationClaimStorage } from './lib/stores.js'

/**
 * @typedef {import('@web3-storage/content-claims/store.js').LocationClaim|import('@web3-storage/content-claims/store.js').PartitionClaim|import('@web3-storage/content-claims/store.js').InclusionClaim|import('@web3-storage/content-claims/store.js').RelationClaim} Claim
 */

Sentry.AWSLambda.init({
  environment: process.env.SST_STAGE,
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0
})

/** CAR CID code */
const carCode = 0x0202

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
  const body = JSON.stringify({ name, version, repo, commit, env })
  return { statusCode: 200, headers: { 'Content-Type': json }, body }
}

/**
 * Handler for GET /
 */
export const getHome = () => {
  const { NAME, VERSION, STAGE, REPO } = process.env
  const env = STAGE === 'prod' ? '' : `(${STAGE})`
  const body = `⁂ ${NAME} v${VERSION} ${env}\n- ${REPO}`
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

  const region = notNully('DYNAMO_REGION', process.env)
  // @ts-expect-error
  const pk = Config.PRIVATE_KEY
  const signer = getServiceSigner({ serviceDID: process.env.SERVICE_DID, privateKey: pk })
  const dynamo = new DynamoDBClient({ region })

  const inclusionStore = new InclusionClaimStorage(dynamo, notNully('INCLUSION_CLAIM_TABLE', process.env))
  const relationStore = new RelationClaimStorage(dynamo, notNully('RELATION_CLAIM_TABLE', process.env))
  const locationStore = new LocationClaimStorage(dynamo, notNully('LOCATION_CLAIM_TABLE', process.env))
  const partitionStore = new PartitionClaimStorage(dynamo, notNully('PARTITION_CLAIM_TABLE', process.env))
  // const blocklyStore = new BlocklyStorage(
  //   dynamo,
  //   notNully('BLOCKLY_TABLE', process.env),
  //   partitionStore,
  //   locationStore
  // )

  const server = createServer({
    id: signer,
    codec: CAR.inbound,
    inclusionStore,
    partitionStore,
    locationStore,
    relationStore
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
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 */
export const getClaims = async event => {
  const region = notNully('DYNAMO_REGION', process.env)
  const dynamo = new DynamoDBClient({ region })

  const inclusionStore = new InclusionClaimStorage(dynamo, notNully('INCLUSION_CLAIM_TABLE', process.env))
  const relationStore = new RelationClaimStorage(dynamo, notNully('RELATION_CLAIM_TABLE', process.env))
  const locationStore = new LocationClaimStorage(dynamo, notNully('LOCATION_CLAIM_TABLE', process.env))
  const partitionStore = new PartitionClaimStorage(dynamo, notNully('PARTITION_CLAIM_TABLE', process.env))

  const walkcsv = new URL(`http://localhost${event.rawPath}?${event.rawQueryString}`).searchParams.get('walk')
  const walk = new Set(walkcsv ? walkcsv.split(',') : [])

  /** @type {Claim[]} */
  const claims = []

  /** @param {Claim} claim */
  const walkKeys = async claim => {
    for (const key of Object.keys(claim).filter(k => k !== 'invocation' && k !== 'content')) {
      // @ts-expect-error
      const content = claim[key]
      if (walk.has(key)) {
        if (Array.isArray(content)) {
          for (const c of content) {
            if (Link.isLink(c)) {
              await fetchClaims(c)
            }
          }
        } else if (Link.isLink(content)) {
          await fetchClaims(content)
        }
      }
    }
  }

  /**
   * // TODO: getAll instead of get first
   * @param {import('multiformats').UnknownLink} content
   */
  const fetchClaims = async content => {
    if (content.code === carCode) {
      const results = await Promise.all([
        locationStore.get(content),
        inclusionStore.get(content)
      ])
      for (const claim of results) {
        if (!claim) continue
        claims.push(claim)
        await walkKeys(claim)
      }
    } else {
      const results = await Promise.all([
        partitionStore.get(content),
        relationStore.get(content)
      ])
      for (const claim of results) {
        if (!claim) continue
        claims.push(claim)
        await walkKeys(claim)
      }
    }
  }

  const content = Link.parse(event.rawPath.split('/')[2])
  await fetchClaims(content)

  return {
    statusCode: 200,
    body: Buffer.from(dagJSON.encode(claims)).toString('base64'),
    isBase64Encoded: true
  }
}
