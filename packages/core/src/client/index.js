/* eslint-env browser */
import { extract as extractDelegation } from '@ucanto/core/delegation'
import { connect, invoke, delegate } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import { sha256 } from 'multiformats/hashes/sha2'
import { decode as decodeDigest } from 'multiformats/hashes/digest'
import { equals } from 'multiformats/bytes'
import { base58btc } from 'multiformats/bases/base58'
import { CARReaderStream } from 'carstream/reader'
import * as Assert from '../capability/assert.js'

export const serviceURL = new URL('https://claims.web3.storage')

/** @type {import('@ucanto/interface').Principal} */
export const servicePrincipal = { did: () => 'did:web:claims.web3.storage' }

/** @type {import('@ucanto/interface').ConnectionView<import('../server/service/api.js').Service>} */
export const connection = connect({
  id: servicePrincipal,
  codec: CAR.outbound,
  channel: HTTP.open({ url: serviceURL, method: 'POST' })
})

export { connect, invoke, delegate, CAR, HTTP }

const assertCapNames = [
  Assert.location.can,
  Assert.partition.can,
  Assert.inclusion.can,
  Assert.relation.can,
  Assert.equals.can
]

/**
 * @param {import('@ucanto/interface').Capability} cap
 * @returns {cap is import('../server/api.js').AnyAssertCap}
 */
const isAssertCap = cap =>
  // @ts-expect-error
  assertCapNames.includes(cap.can) &&
  'nb' in cap &&
  typeof cap.nb === 'object' &&
  'content' in cap.nb

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<import('./api.js').Claim>}
 */
export const decode = async bytes => {
  const delegation = await extractDelegation(bytes)
  if (delegation.error) {
    throw new Error('failed to decode claim', { cause: delegation.error })
  }
  const cap = delegation.ok.capabilities[0]
  if (!isAssertCap(cap)) {
    throw new Error('invalid claim')
  }
  // @ts-expect-error
  return {
    ...cap.nb,
    content: 'digest' in cap.nb.content ? decodeDigest(cap.nb.content.digest) : cap.nb.content.multihash,
    type: cap.can,
    export: () => delegation.ok.export(),
    archive: async () => bytes
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
 * @param {import('multiformats').MultihashDigest} content
 * @param {FetchOptions} [options]
 */
export const fetch = async (content, options) => {
  const path = `/claims/multihash/${base58btc.encode(content.bytes)}`
  const url = new URL(path, options?.serviceURL ?? serviceURL)
  if (options?.walk) url.searchParams.set('walk', options.walk.join(','))
  return globalThis.fetch(url)
}

/**
 * Read content claims from the service for the given content CID.
 *
 * @param {import('multiformats').MultihashDigest} content
 * @param {FetchOptions} [options]
 * @returns {Promise<import('./api.js').Claim[]>}
 */
export const read = async (content, options) => {
  const res = await fetch(content, options)
  if (!res.ok) throw new Error(`unexpected service status: ${res.status}`, { cause: await res.text() })
  if (!res.body) throw new Error('missing response body')

  /** @type {import('./api.js').Claim[]} */
  const claims = []
  try {
    await res.body
      .pipeThrough(new CARReaderStream())
      .pipeTo(new WritableStream({
        async write (block) {
          const digest = await sha256.digest(block.bytes)
          if (!equals(block.cid.multihash.bytes, digest.bytes)) {
            throw new Error(`hash verification failed: ${block.cid}`)
          }
          const claim = await decode(block.bytes)
          claims.push(claim)
        }
      }))
  } catch (/** @type {any} */ err) {
    if (!claims.length && err.message === 'unexpected end of data') {
      return claims
    }
    throw err
  }

  return claims
}
