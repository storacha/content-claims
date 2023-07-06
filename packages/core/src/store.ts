import { UnknownLink, Link } from 'multiformats/link'

export interface LocationClaim {
  invocation: Link
  content: UnknownLink
  location: URL[]
  range?: { offset: number, length?: number }
}

export interface LocationClaimStore {
  put (claim: LocationClaim): Promise<void>
  get (content: UnknownLink): Promise<LocationClaim|undefined>
  getMany (contents: UnknownLink[]): Promise<LocationClaim[]>
}

export interface InclusionClaim {
  invocation: Link
  content: UnknownLink
  includes: UnknownLink
  proof?: UnknownLink
}

export interface InclusionClaimStore {
  put (claim: InclusionClaim): Promise<void>
  get (content: UnknownLink): Promise<InclusionClaim|undefined>
}

export interface PartitionClaim {
  invocation: Link
  content: UnknownLink
  blocks?: UnknownLink
  parts: UnknownLink[]
}

export interface PartitionClaimStore {
  put (claim: PartitionClaim): Promise<void>
  get (content: UnknownLink): Promise<PartitionClaim|undefined>
}

export interface RelationClaim {
  invocation: Link
  content: UnknownLink
  child: UnknownLink[]
}

export interface RelationClaimStore {
  put (claim: RelationClaim): Promise<void>
  get (parent: UnknownLink): Promise<RelationClaim|undefined>
}
