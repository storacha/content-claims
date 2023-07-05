import * as Inclusion from './inclusion.js'
import * as Location from './location.js'
import * as Partition from './partition.js'
import * as Relation from './relation.js'

/**
 * @typedef {import('./inclusion').AssertInclusionServiceContext & import('./location').AssertLocationServiceContext & import('./partition').AssertPartitionServiceContext & import('./relation').AssertRelationServiceContext} AssertServiceContext
 * @typedef {{
 *   location: import('@ucanto/server').ServiceMethod<import('../../capability/assert.js').AssertLocation, {}, import('@ucanto/server').Failure>
 *   inclusion: import('@ucanto/server').ServiceMethod<import('../../capability/assert.js').AssertInclusion, {}, import('@ucanto/server').Failure>
 *   partition: import('@ucanto/server').ServiceMethod<import('../../capability/assert.js').AssertPartition, {}, import('@ucanto/server').Failure>
 *   relation: import('@ucanto/server').ServiceMethod<import('../../capability/assert.js').AssertRelation, {}, import('@ucanto/server').Failure>
 * }} AssertService
 */

export { Inclusion, Location, Partition, Relation }

/**
 * @param {AssertServiceContext} context
 * @returns {AssertService}
 */
export function createService (context) {
  return {
    inclusion: Inclusion.provide(context),
    location: Location.provide(context),
    partition: Partition.provide(context),
    relation: Relation.provide(context)
  }
}
