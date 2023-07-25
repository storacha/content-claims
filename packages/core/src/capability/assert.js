import { capability, URI, Link, Schema } from '@ucanto/server'

/**
 * @typedef {import('@ucanto/server').InferInvokedCapability<typeof assert>} Assert
 * @typedef {import('@ucanto/server').InferInvokedCapability<typeof location>} AssertLocation
 * @typedef {import('@ucanto/server').InferInvokedCapability<typeof inclusion>} AssertInclusion
 * @typedef {import('@ucanto/server').InferInvokedCapability<typeof partition>} AssertPartition
 * @typedef {import('@ucanto/server').InferInvokedCapability<typeof descendant>} AssertDescendant
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
 * Claims that a CID includes the contents claimed in another CID.
 */
export const inclusion = capability({
  can: 'assert/inclusion',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /** CAR CID */
    content: Link,
    /** CARv2 index CID */
    includes: Link.match({ version: 1 }),
    proof: Link.match({ version: 1 }).optional()
  })
})

/**
 * Claims that a CID's graph can be read from the blocks found in parts.
 */
export const partition = capability({
  can: 'assert/partition',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /** Content root CID */
    content: Link,
    /** CIDs CID */
    blocks: Link.match({ version: 1 }).optional(),
    parts: Schema.array(Link.match({ version: 1 }))
  })
})

export const descendant = capability({
  can: 'assert/descendant',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /** Content root CID */
    content: Link,
    /** Descendant content CID */
    descends: Link
  })
})

/**
 * Claims that a CID links to other CIDs.
 * @deprecated
 */
export const relation = capability({
  can: 'assert/relation',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    content: Link,
    children: Schema.array(Link),
    parts: Schema.array(Schema.struct({
      content: Link.match({ version: 1 }),
      includes: Link.match({ version: 1 })
    }))
  })
})
