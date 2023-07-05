import * as Server from '@ucanto/server'
import * as Assert from '../../capabilities.js'

/** @typedef {{ locationStore: import('../../store').LocationClaimStore }} AssertLocationServiceContext */

/** @param {AssertLocationServiceContext} context */
export const provide = context => Server.provide(Assert.location, input => handler(input, context))

/**
 * @param {import('@ucanto/server').ProviderInput<import('../../capabilities.js').AssertLocation>} input
 * @param {AssertLocationServiceContext} context
 * @returns {Promise<import('@ucanto/server').Result<{}, import('@ucanto/server').Failure>>}
 */
export const handler = async ({ capability }, { locationStore }) => {
  const { content, location, range } = capability.nb
  const claim = { content, location: location.map(s => new URL(s)), range }
  await locationStore.put(claim)
  return { ok: {} }
}
