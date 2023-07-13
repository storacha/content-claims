import { UnknownLink, Link } from 'multiformats/link'

export interface Claim {
  claim: Link
  bytes: Uint8Array
  content: UnknownLink
  expiration?: number
}

export interface ClaimFetcher {
  get (content: UnknownLink): Promise<Claim[]>
}

export interface ClaimStore extends ClaimFetcher {
  put (claim: Claim): Promise<void>
}
