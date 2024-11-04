import { Link, URI, UnknownLink, Block, MultihashDigest } from '@ucanto/client'
import * as Assert from '../capability/assert.js'

/** A verifiable claim about data. */
export interface ContentClaim<T extends string> {
  /** Subject of the claim e.g. CAR, DAG root etc. */
  readonly content: MultihashDigest
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

/**
 * A claim that a content graph can be found in blob(s) that are identified and
 * indexed in the given index CID.
 */
export interface IndexClaim extends ContentClaim<typeof Assert.index.can> {
  /**
   * Link to a Content Archive that contains the index.
   * e.g. `index/sharded/dag@0.1`
   * @see https://github.com/storacha/specs/blob/main/w3-index.md
   */
  readonly index: Link
}

/** A claim that a CID links to other CIDs. */
export interface RelationClaim extends ContentClaim<typeof Assert.relation.can> {
  /** CIDs of blocks this content directly links to. */
  readonly children: UnknownLink[]
  /** List of archives (CAR CIDs) containing the blocks. */
  readonly parts: RelationPart[]
}

/** Part this content and it's children can be read from. */
export interface RelationPart {
  /** Part CID. */
  content: Link
  /** CID of contents (CARv2 index) included in this part. */
  includes?: RelationPartInclusion
}

export interface RelationPartInclusion {
  /** Inclusion CID (CARv2 index) */
  content: Link
  /** CIDs of parts this index may be found in. */
  parts?: Link[]
}

/** A claim that the same data is referred to by another CID and/or multihash */
export interface EqualsClaim extends ContentClaim<typeof Assert.equals.can> {
  /** A CID that is equivalent to the content CID e.g the Piece CID for that CAR CID */
  readonly equals: UnknownLink
}

/** Types of claim that are known to this library. */
export type KnownClaimTypes = 
  | typeof Assert.location.can
  | typeof Assert.partition.can
  | typeof Assert.inclusion.can
  | typeof Assert.index.can
  | typeof Assert.relation.can
  | typeof Assert.equals.can

/** A verifiable claim about data. */
export type Claim =
  | LocationClaim
  | PartitionClaim
  | InclusionClaim
  | IndexClaim
  | RelationClaim
  | EqualsClaim
  | UnknownClaim

export interface ByteRange {
  readonly offset: number
  readonly length?: number
}
