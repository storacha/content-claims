import { capability, URI, Schema } from '@ucanto/server'

const linkOrDigest = () => Schema.link().or(Schema.struct({ digest: Schema.bytes() }))

export const assert = capability({
  can: 'assert/*',
  with: URI.match({ protocol: 'did:' })
})

/**
 * Claims that a CID is available at a URL.
 */
export const location = capability({
  can: 'assert/location',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /** CAR CID */
    content: linkOrDigest(),
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
    content: linkOrDigest(),
    /** CARv2 index CID */
    includes: Schema.link({ version: 1 }),
    proof: Schema.link({ version: 1 }).optional()
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
    content: linkOrDigest(),
    /** CIDs CID */
    blocks: Schema.link({ version: 1 }).optional(),
    parts: Schema.array(Schema.link({ version: 1 }))
  })
})

/**
 * Claim data is referred to by another CID and/or multihash. e.g CAR CID & CommP CID
 */
export const equals = capability({
  can: 'assert/equals',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    content: linkOrDigest(),
    equals: Schema.link()
  })
})
