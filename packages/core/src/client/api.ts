import { Link, URI, UnknownLink } from '@ucanto/client'

export interface ClaimGroups {
  location: LocationClaim[]
  partition: PartitionClaim[]
  inclusion: InclusionClaim[]
  relation: RelationClaim[]
  unknown: UnknownClaim[]
}

export interface ContentClaim<T extends string> {
  readonly content: UnknownLink
  readonly type: T
  archive (): Promise<Uint8Array>
}

export interface UnknownClaim extends ContentClaim<'unknown'> {}

export interface LocationClaim extends ContentClaim<'location'> {
  readonly location: URI[]
  readonly range?: ByteRange
}

export interface PartitionClaim extends ContentClaim<'partition'> {
  readonly blocks?: Link
  readonly parts: Link[]
}

export interface InclusionClaim extends ContentClaim<'inclusion'> {
  readonly includes: Link
  readonly proof?: Link
}

export interface RelationClaim extends ContentClaim<'relation'> {
  readonly children: Link[]
  readonly parts: Link[]
}

export type Claim =
  | LocationClaim
  | PartitionClaim
  | InclusionClaim
  | RelationClaim
  | UnknownClaim

export interface ByteRange {
  readonly offset: number
  readonly length?: number
}
