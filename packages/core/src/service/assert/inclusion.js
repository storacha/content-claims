import * as Server from '@ucanto/server'
import * as Assert from '../../capability/assert.js'

/** @typedef {{ inclusionStore: import('../../store').InclusionClaimStore }} AssertInclusionServiceContext */

/** @param {AssertInclusionServiceContext} context */
export const provide = context => Server.provide(Assert.inclusion, input => handler(input, context))

/**
 * @param {import('@ucanto/server').ProviderInput<import('../../capability/assert.js').AssertInclusion>} input
 * @param {AssertInclusionServiceContext} context
 * @returns {Promise<import('@ucanto/server').Result<{}, import('@ucanto/server').Failure>>}
 */
export const handler = async ({ capability }, { inclusionStore }) => {
  const { content, includes, proof } = capability.nb
  const claim = { content, includes, proof }
  await inclusionStore.put(claim)
  return { ok: {} }
}
