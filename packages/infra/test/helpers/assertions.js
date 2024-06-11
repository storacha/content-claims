import { equals } from 'multiformats/bytes'

/**
 * @param {import('multiformats').MultihashDigest} a
 * @param {import('multiformats').MultihashDigest} b
 */
export const assertDigestEquals = (a, b) => equals(a.bytes, b.bytes)
