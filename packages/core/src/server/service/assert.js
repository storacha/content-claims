import * as Server from '@ucanto/server'
import * as Assert from '../../capability/assert.js'

/**
 * @param {import('./api').AssertServiceContext} context
 * @returns {import('./api').AssertService}
 */
export function createService (context) {
  return {
    inclusion: Server.provide(Assert.inclusion, input => handler(input, context)),
    location: Server.provide(Assert.location, input => handler(input, context)),
    partition: Server.provide(Assert.partition, input => handler(input, context)),
    descendant: Server.provide(Assert.descendant, input => handler(input, context)),
    relation: Server.provide(Assert.relation, input => handler(input, context))
  }
}

/**
 * @template {import('@ucanto/interface').Ability} Can
 * @template {import('@ucanto/interface').URI} Resource
 * @template {{ content: import('multiformats').Link }} Caveats
 * @template {import('@ucanto/interface').ParsedCapability<Can, Resource, Caveats>} ParsedCap
 * @param {import('@ucanto/interface').ProviderInput<ParsedCap>} input
 * @param {import('./api').AssertServiceContext} context
 * @returns {Promise<import('@ucanto/server').Result<{}, import('@ucanto/server').Failure>>}
 */
export const handler = async ({ capability, invocation }, { claimStore }) => {
  const { content } = capability.nb
  const archive = await invocation.archive()
  if (archive.error) throw new Error('failed invocation archive', { cause: archive.error })
  const claim = {
    claim: invocation.cid,
    bytes: archive.ok,
    content,
    expiration: invocation.expiration
  }
  await claimStore.put(claim)
  return { ok: {} }
}
