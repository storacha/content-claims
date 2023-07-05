import { UnknownLink } from '@ucanto/server'

export interface LocationClaim {
  content: UnknownLink
  location: URL[]
  range?: { offset: number, length?: number }
}

export interface LocationClaimStore {
  put (claim: LocationClaim): Promise<void>
  getMany (contents: UnknownLink[]): Promise<LocationClaim[]>
}

export interface InclusionClaim {
  content: UnknownLink
  includes: UnknownLink
  proof?: UnknownLink
}

export interface InclusionClaimStore {
  put (claim: InclusionClaim): Promise<void>
}

export interface PartitionClaim {
  content: UnknownLink
  blocks?: UnknownLink
  parts: UnknownLink[]
}

export interface PartitionClaimStore {
  put (claim: PartitionClaim): Promise<void>
}

export interface RelationClaim {
  parent: UnknownLink
  child: UnknownLink[]
}

export interface RelationClaimStore {
  put (claim: RelationClaim): Promise<void>
}
