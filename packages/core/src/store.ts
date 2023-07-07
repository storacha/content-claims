import { UnknownLink, Link } from 'multiformats/link'

export interface LocationClaim {
  claim: Link
  content: UnknownLink
  location: URL[]
  range?: { offset: number, length?: number }
}

export interface LocationClaimStore {
  put (claim: LocationClaim): Promise<void>
  get (content: UnknownLink): Promise<LocationClaim|undefined>
}

export interface InclusionClaim {
  claim: Link
  content: UnknownLink
  includes: UnknownLink
  proof?: UnknownLink
}

export interface InclusionClaimStore {
  put (claim: InclusionClaim): Promise<void>
  get (content: UnknownLink): Promise<InclusionClaim|undefined>
}

export interface PartitionClaim {
  claim: Link
  content: UnknownLink
  blocks?: UnknownLink
  parts: UnknownLink[]
}

export interface PartitionClaimStore {
  put (claim: PartitionClaim): Promise<void>
  get (content: UnknownLink): Promise<PartitionClaim|undefined>
}

export interface RelationClaim {
  claim: Link
  content: UnknownLink
  child: UnknownLink[]
}

export interface RelationClaimStore {
  put (claim: RelationClaim): Promise<void>
  get (parent: UnknownLink): Promise<RelationClaim|undefined>
}
