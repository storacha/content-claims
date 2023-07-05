import * as Sentry from '@sentry/serverless'
import { createServer } from '@web3-storage/content-claims/server'
import * as CAR from '@ucanto/transport/car'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { getServiceSigner, notNully } from './lib/config.js'
import { BlocklyStorage, InclusionClaimStorage, LocationClaimStorage, PartitionClaimStorage, RelationClaimStorage } from './lib/stores.js'

Sentry.AWSLambda.init({
  environment: process.env.SST_STAGE,
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0
})

const text = 'text/plain; charset=utf-8'
const json = 'application/json'

/**
 * @param {import('aws-lambda').APIGatewayProxyEventV2} event
 */
export const _handler = async event => {
  const { rawPath } = event
  const { method } = event.requestContext.http
  if (method === 'GET') {
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
  const { VERSION, BRANCH, STAGE, REPO } = process.env
  const env = STAGE === 'prod' ? '' : `(${STAGE})`
  const repo = BRANCH === 'main' ? REPO : `${REPO}/tree/${BRANCH}`
  const body = `⁂ content-claims v${VERSION} ${env}\n- ${repo}`
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
  const pk = notNully('PRIVATE_KEY', process.env)
  const signer = getServiceSigner({ serviceDID: process.env.SERVICE_DID, privateKey: pk })
  const dynamo = new DynamoDBClient({ region })

  const inclusionStore = new InclusionClaimStorage(dynamo, notNully('INCLUSION_CLAIM_TABLE', process.env))
  const relationStore = new RelationClaimStorage(dynamo, notNully('RELATION_CLAIM_TABLE', process.env))
  const locationStore = new LocationClaimStorage(dynamo, notNully('LOCATION_CLAIM_TABLE', process.env))
  const partitionStore = new PartitionClaimStorage(dynamo, notNully('PARTITION_CLAIM_TABLE', process.env))
  const blocklyStore = new BlocklyStorage(
    dynamo,
    notNully('BLOCKLY_TABLE', process.env),
    partitionStore,
    locationStore
  )

  const server = createServer({
    id: signer,
    codec: CAR.inbound,
    inclusionStore,
    partitionStore: blocklyStore,
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
