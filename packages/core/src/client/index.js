/* eslint-env browser */
import { extract as extractDelegation } from '@ucanto/core/delegation'
import { connect, invoke, delegate } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals } from 'multiformats/bytes'
import { CARReaderStream } from 'carstream/reader'
import * as Assert from '../capability/assert.js'

export * from './api.js'

export const serviceURL = new URL('https://claims.web3.storage')

/** @type {import('@ucanto/interface').Principal} */
export const servicePrincipal = { did: () => 'did:web:claims.web3.storage' }

/** @type {import('@ucanto/interface').ConnectionView<import('../service/index.js').Service>} */
export const connection = connect({
  id: servicePrincipal,
  codec: CAR.outbound,
  channel: HTTP.open({ url: serviceURL, method: 'POST' })
})

export { connect, invoke, delegate, CAR, HTTP }

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<import('./api').Claim>}
 */
const fromArchive = async bytes => {
  const delegation = await extractDelegation(bytes)
  if (delegation.error) {
    throw new Error('failed to decode claim', { cause: delegation.error })
  }
  const cap = delegation.ok.capabilities[0]
  if (!cap.nb || typeof cap.nb !== 'object' || !('content' in cap.nb)) {
    throw new Error('invalid claim')
  }
  // @ts-expect-error
  return { ...cap.nb, type: claimType(cap.can), archive: async () => bytes }
}

/** @param {string} can */
const claimType = can =>
  can === Assert.location.can
    ? Assert.location.can
    : can === Assert.partition.can
      ? Assert.partition.can
      : can === Assert.inclusion.can
        ? Assert.inclusion.can
        : can === Assert.relation.can
          ? Assert.relation.can
          : 'unknown'

/**
 * Extracts content claims from blocks, verifying hashes.
 * TODO: verify claim signatures.
 *
 * @extends {TransformStream<import('carstream/api').Block, import('./api').Claim>}
 */
export class ClaimReaderStream extends TransformStream {
  /**
   * @param {QueuingStrategy<import('carstream/api').Block>} [writableStrategy]
   * @param {QueuingStrategy<import('./api').Claim>} [readableStrategy]
   */
  constructor (writableStrategy, readableStrategy) {
    super({
      async transform (block, controller) {
        const digest = await sha256.digest(block.bytes)
        if (!equals(block.cid.multihash.bytes, digest.bytes)) {
          throw new Error(`hash verification failed: ${block.cid}`)
        }
        controller.enqueue(await fromArchive(block.bytes))
      }
    }, writableStrategy, readableStrategy)
  }
}

/**
 * Fetch a CAR archive of claims from the service. Note: no verification is
 * performed on the response data.
 *
 * @typedef {{
*   walk?: Array<'parts'|'includes'|'children'>
*   serviceURL?: URL
* }} FetchOptions
* @param {import('@ucanto/client').UnknownLink} content
* @param {FetchOptions} [options]
*/
export const fetch = async (content, options) => {
  const url = new URL(`/claims/${content}`, options?.serviceURL ?? serviceURL)
  if (options?.walk) url.searchParams.set('walk', options.walk.join(','))
  return globalThis.fetch(url)
}

/**
 * Read content claims from the service for the given content CID.
 *
 * @param {import('@ucanto/client').UnknownLink} content
 * @param {FetchOptions} [options]
 * @returns {Promise<import('./api').Claim[]>}
 */
export const read = async (content, options) => {
  const res = await fetch(content, options)
  if (!res.ok) throw new Error(`unexpected service status: ${res.status}`, { cause: await res.text() })
  if (!res.body) throw new Error('missing response body')

  /** @type {import('./api').Claim[]} */
  const claims = []
  try {
    await res.body
      .pipeThrough(new CARReaderStream())
      .pipeThrough(new ClaimReaderStream())
      .pipeTo(new WritableStream({ write: claim => { claims.push(claim) } }))
  } catch (/** @type {any} */ err) {
    if (!claims.length && err.message === 'unexpected end of data') {
      return claims
    }
    throw err
  }

  return claims
}
