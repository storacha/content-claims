import { MultihashDigest } from 'multiformats/hashes/digest'
import { UnknownLink, Link } from 'multiformats/link'
import { AnyAssertCap } from './service/api.js'

export { AnyAssertCap }

export interface Claim {
  claim: Link
  bytes: Uint8Array
  content: MultihashDigest
  expiration?: number,
  value: AnyAssertCap
}

export interface ClaimFetcher {
  get (content: UnknownLink): Promise<Claim[]>
}

export interface ClaimStore extends ClaimFetcher {
  put (claim: Claim): Promise<void>
}
