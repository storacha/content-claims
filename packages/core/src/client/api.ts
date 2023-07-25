import { Link, URI, UnknownLink, Block } from '@ucanto/client'
import * as Assert from '../capability/assert'

/** A verifiable claim about data. */
export interface ContentClaim<T extends string> {
  /** Subject of the claim e.g. CAR CID, DAG root CID etc. */
  readonly content: UnknownLink
  /** Discriminator for different types of claims. */
  readonly type: T
  /**
   * Returns an iterable of all IPLD blocks that are included in this claim.
   */
  export (): IterableIterator<Block>
  /**
   * Writes the UCAN `Delegation` chain for this claim into a content addressed
   * archive (CAR) buffer and returns it.
   */
  archive (): Promise<Uint8Array>
}

/** A claim not known to this library. */
export interface UnknownClaim extends ContentClaim<'unknown'> {}

/** A claim that a CID is available at a URL. */
export interface LocationClaim extends ContentClaim<typeof Assert.location.can> {
  readonly location: URI[]
  readonly range?: ByteRange
}

/** A claim that a CID's graph can be read from the blocks found in parts. */
export interface PartitionClaim extends ContentClaim<typeof Assert.partition.can> {
  /** CIDs CID - the hash of the binary sorted links in the set. */
  readonly blocks?: Link
  /** List of archives (CAR CIDs) containing the blocks. */
  readonly parts: Link[]
}

/** A claim that a CID includes the contents claimed in another CID. */
export interface InclusionClaim extends ContentClaim<typeof Assert.inclusion.can> {
  /** e.g. CARv2 Index CID or Sub-Deal CID (CommP) */
  readonly includes: Link
  /** Zero-knowledge proof */
  readonly proof?: Link
}

/** A claim that a CID is linked to directly or indirectly by another CID. */
export interface DescendantClaim extends ContentClaim<typeof Assert.descendant.can> {
  /** Ancestor content CID. */
  readonly ancestor: UnknownLink
}

/**
 * A claim that a CID links to other CIDs.
 * @deprecated
 */
export interface RelationClaim extends ContentClaim<typeof Assert.relation.can> {
  /** CIDs of blocks this content directly links to. */
  readonly children: Link[]
  /** List of archives (CAR CIDs) containing the blocks. */
  readonly parts: Array<{ content: Link, includes: Link }>
}

/** Types of claim that are known to this library. */
export type KnownClaimTypes = 
  | typeof Assert.location.can
  | typeof Assert.partition.can
  | typeof Assert.inclusion.can
  | typeof Assert.descendant.can
  | typeof Assert.relation.can

/** A verifiable claim about data. */
export type Claim =
  | LocationClaim
  | PartitionClaim
  | InclusionClaim
  | DescendantClaim
  | RelationClaim
  | UnknownClaim

export interface ByteRange {
  readonly offset: number
  readonly length?: number
}
