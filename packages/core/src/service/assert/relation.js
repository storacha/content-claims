import * as Server from '@ucanto/server'
import * as Assert from '../../capability/assert.js'

/** @typedef {{ relationStore: import('../../store').RelationClaimStore }} AssertRelationServiceContext */

/** @param {AssertRelationServiceContext} context */
export const provide = context => Server.provide(Assert.relation, input => handler(input, context))

/**
 * @param {import('@ucanto/server').ProviderInput<import('../../capability/assert.js').AssertRelation>} input
 * @param {AssertRelationServiceContext} context
 * @returns {Promise<import('@ucanto/server').Result<{}, import('@ucanto/server').Failure>>}
 */
export const handler = async ({ capability, invocation }, { relationStore }) => {
  const { content, child } = capability.nb
  const claim = { claim: invocation.cid, content, child }
  await relationStore.put(claim)
  return { ok: {} }
}
