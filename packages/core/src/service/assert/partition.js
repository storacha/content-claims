import * as Server from '@ucanto/server'
import * as Assert from '../../capability/assert.js'

/** @typedef {{ partitionStore: import('../../store').PartitionClaimStore }} AssertPartitionServiceContext */

/** @param {AssertPartitionServiceContext} context */
export const provide = context => Server.provide(Assert.partition, input => handler(input, context))

/**
 * @param {import('@ucanto/server').ProviderInput<import('../../capability/assert.js').AssertPartition>} input
 * @param {AssertPartitionServiceContext} context
 * @returns {Promise<import('@ucanto/server').Result<{}, import('@ucanto/server').Failure>>}
 */
export const handler = async ({ capability, invocation }, { partitionStore }) => {
  const { content, blocks, parts } = capability.nb
  const claim = { claim: invocation.cid, content, blocks, parts }
  await partitionStore.put(claim)
  return { ok: {} }
}
