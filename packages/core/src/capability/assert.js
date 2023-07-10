import { capability, URI, Link, Schema } from '@ucanto/server'

/**
 * @typedef {import('@ucanto/server').InferInvokedCapability<typeof assert>} Assert
 * @typedef {import('@ucanto/server').InferInvokedCapability<typeof location>} AssertLocation
 * @typedef {import('@ucanto/server').InferInvokedCapability<typeof inclusion>} AssertInclusion
 * @typedef {import('@ucanto/server').InferInvokedCapability<typeof partition>} AssertPartition
 * @typedef {import('@ucanto/server').InferInvokedCapability<typeof relation>} AssertRelation
 */

export const assert = capability({
  can: 'assert/*',
  with: URI.match({ protocol: 'did:' })
})

/**
 * Claim that a CID is available at a URL.
 */
export const location = capability({
  can: 'assert/location',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /** CAR CID */
    content: Link,
    location: Schema.array(URI),
    range: Schema.struct({
      offset: Schema.integer(),
      length: Schema.integer().optional()
    }).optional()
  })
})

/**
 * Claim that within a CAR, there are a bunch of CIDs (and their offsets).
 */
export const inclusion = capability({
  can: 'assert/inclusion',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /** CAR CID */
    content: Link,
    /** CARv2 index CID */
    includes: Link,
    proof: Link.optional()
  })
})

/**
 * Claims that a DAG can be found in a bunch of CAR files.
 */
export const partition = capability({
  can: 'assert/partition',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /** Content root CID */
    content: Link,
    /** CIDs CID */
    blocks: Link.optional(), // TODO: do we need/can we generate?
    parts: Schema.array(Link)
  })
})

/**
 * Claim that a block links to other block(s). Similar to a partition claim
 * a relation claim asserts that a block of content links to other blocks and
 * that the block and it's links may be found in the specified parts.
 */
export const relation = capability({
  can: 'assert/relation',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    content: Link,
    children: Schema.array(Link),
    parts: Schema.array(Link)
  })
})
