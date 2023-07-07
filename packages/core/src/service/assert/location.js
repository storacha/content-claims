import * as Server from '@ucanto/server'
import * as Assert from '../../capability/assert.js'

/** @typedef {{ claimStore: import('../../store').ClaimStore }} AssertLocationServiceContext */

/** @param {AssertLocationServiceContext} context */
export const provide = context => Server.provide(Assert.location, input => handler(input, context))

/**
 * @param {import('@ucanto/server').ProviderInput<import('../../capability/assert.js').AssertLocation>} input
 * @param {AssertLocationServiceContext} context
 * @returns {Promise<import('@ucanto/server').Result<{}, import('@ucanto/server').Failure>>}
 */
export const handler = async ({ capability, invocation }, { claimStore }) => {
  const { content } = capability.nb
  const archive = await invocation.archive()
  if (archive.error) throw new Error('failed invocation archive', { cause: archive.error })
  const claim = {
    type: 'location',
    claim: invocation.cid,
    bytes: archive.ok,
    content,
    expiration: invocation.expiration
  }
  await claimStore.put(claim)
  return { ok: {} }
}
