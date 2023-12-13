import { capability, URI, Link, Schema } from '@ucanto/server'

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

/**
 * Claims that a CID links to other CIDs.
 */
export const relation = capability({
  can: 'assert/relation',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    content: Link,
    /** CIDs this content links to directly. */
    children: Schema.array(Link),
    /** Parts this content and it's children can be read from. */
    parts: Schema.array(Schema.struct({
      content: Link.match({ version: 1 }),
      /** CID of contents (CARv2 index) included in this part. */
      includes: Schema.struct({
        content: Link.match({ version: 1 }),
        /** CIDs of parts this index may be found in. */
        parts: Schema.array(Link.match({ version: 1 })).optional()
      }).optional()
    }))
  })
})

/**
 * Claim data is referred to by another CID and/or multihash. e.g CAR CID & CommP CID
 */
export const equals = capability({
  can: 'assert/equals',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    content: Link,
    equals: Link
  })
})
