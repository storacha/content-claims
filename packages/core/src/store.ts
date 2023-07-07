import { UnknownLink, Link } from 'multiformats/link'

export interface Claim {
  type: string
  claim: Link
  bytes: Uint8Array
  content: UnknownLink
  expiration?: number
}

export interface ClaimStore {
  put (claim: Claim): Promise<void>
  get (content: UnknownLink): Promise<Claim|undefined>
  list (content: UnknownLink): Promise<Claim[]>
}
