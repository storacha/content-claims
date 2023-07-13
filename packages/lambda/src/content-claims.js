/* global ReadableStream, WritableStream */
import * as Sentry from '@sentry/serverless'
import { createServer } from '@web3-storage/content-claims/server'
import * as CAR from '@ucanto/transport/car'
import * as Delegation from '@ucanto/core/delegation'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { Config } from 'sst/node/config'
import * as Link from 'multiformats/link'
import { sha256 } from 'multiformats/hashes/sha2'
import { CARWriterStream } from 'carstream'
import { getServiceSigner, notNully } from './lib/config.js'
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
  const dynamo = new DynamoDBClient({ region })
  const claimStore = new ClaimStorage(dynamo, notNully('CLAIM_TABLE', process.env))

  const server = createServer({
    id: signer,
    codec: CAR.inbound,
    claimStore
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

  /** @type {import('@web3-storage/content-claims/server/api').ClaimFetcher} */
  let claimFetcher
  if (process.env.BLOCK_INDEX_TABLE) {
    claimFetcher = new TieredClaimFetcher([
      new ClaimStorage(dynamo, notNully('CLAIM_TABLE', process.env)),
      new BlockIndexClaimFetcher(dynamo, process.env.BLOCK_INDEX_TABLE, signer)
    ])
  } else {
    claimFetcher = new ClaimStorage(dynamo, notNully('CLAIM_TABLE', process.env))
  }

  const walkcsv = new URL(`http://localhost${event.rawPath}?${event.rawQueryString}`).searchParams.get('walk')
  const walk = new Set(walkcsv ? walkcsv.split(',') : [])
  const content = Link.parse(event.rawPath.split('/')[2])

  const queue = [content]
  /** @type {ReadableStream<import('carstream/api').Block>} */
  const readable = new ReadableStream({
    async pull (controller) {
      const content = queue.shift()
      if (!content) return controller.close()

      const results = await claimFetcher.get(content)
      if (!results.length) return

      for (const result of results) {
        controller.enqueue({
          cid: Link.create(0x0202, await sha256.digest(result.bytes)),
          bytes: result.bytes
        })

        if (walk.size) {
          const claim = await Delegation.extract(result.bytes)
          if (claim.error) {
            console.error(claim.error)
            continue
          }

          const nb = claim.ok.capabilities[0].nb
          if (!nb) continue

          for (const key of Object.keys(nb).filter(k => k !== 'content')) {
            // @ts-expect-error
            const content = nb[key]
            if (walk.has(key)) {
              if (Array.isArray(content)) {
                for (const c of content) {
                  if (Link.isLink(c)) {
                    queue.push(c)
                  }
                }
              } else if (Link.isLink(content)) {
                queue.push(content)
              }
            }
          }
        }
      }
    }
  })

  /** @type {Uint8Array[]} */
  const chunks = []
  await readable
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
