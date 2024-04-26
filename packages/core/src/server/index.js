/* global ReadableStream */
import * as Server from '@ucanto/server'
import * as Delegation from '@ucanto/core/delegation'
import * as Link from 'multiformats/link'
import { sha256 } from 'multiformats/hashes/sha2'
import { createService } from './service/index.js'

/** @typedef {import('@ucanto/interface').ServerView<import('./service/api.js').Service>} Server */

/**
 * @param {import('./service/api.js').ServiceContext & {
 *   id: import('@ucanto/server').Signer
 *   codec: import('@ucanto/server').InboundCodec
 *   validateAuthorization: import('@ucanto/interface').RevocationChecker['validateAuthorization']
 *   errorReporter?: { catch: (err: import('@ucanto/server').HandlerExecutionError) => void }
 * }} config
 * @returns {Server}
 */
export const createServer = ({ id, codec, errorReporter: errorHandler, validateAuthorization, ...context }) =>
  Server.create({
    id,
    codec,
    service: createService(context),
    catch: errorHandler?.catch,
    validateAuthorization
  })

/**
 * Fetch claims for the passed content CID and walk the specified paths,
 * returning a stream of content claims.
 *
 * @param {{ claimFetcher: import('./api.js').ClaimFetcher }} context
 * @param {import('multiformats').MultihashDigest} content
 * @param {Set<string>} walk
 */
export const walkClaims = (context, content, walk) => {
  const queue = [content]
  /** @type {ReadableStream<import('carstream/api').Block>} */
  const readable = new ReadableStream({
    async pull (controller) {
      const content = queue.shift()
      if (!content) return controller.close()

      const results = await context.claimFetcher.get(content)
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

          /** @param {object} obj */
          const walkKeys = obj => {
            for (const key of Object.keys(obj).filter(k => k !== 'content')) {
              // @ts-expect-error
              const content = obj[key]
              if (walk.has(key)) {
                if (Array.isArray(content)) {
                  for (const c of content) {
                    if (Link.isLink(c)) {
                      queue.push(c.multihash)
                    } else if (content && typeof content === 'object') {
                      walkKeys(content)
                    }
                  }
                } else if (Link.isLink(content)) {
                  queue.push(content.multihash)
                } else if (content && typeof content === 'object') {
                  walkKeys(content)
                }
              }
            }
          }

          walkKeys(nb)
        }
      }
    }
  })

  return readable
}
