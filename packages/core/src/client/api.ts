import { Delegation, Capability, Ability, Resource, Caveats } from '@ucanto/client'
import * as Assert from '../capability/assert.js'
import { AssertEquals, AssertInclusion, AssertIndex, AssertLocation, AssertPartition, AssertRelation } from '../capability/api.js'

type InferCaveats<C extends Capability> = C extends Capability<Ability, Resource, infer NB> ? NB : never

type InferContent<C extends Caveats> = C extends { content: infer T} ? T : never

/** A verifiable claim about data. */
export interface ContentClaim<T extends string> {
  /** Subject of the claim e.g. CAR, DAG root etc. */
  readonly content: InferContent<InferCaveats<AssertLocation | AssertPartition | AssertInclusion | AssertIndex | AssertEquals | AssertRelation>>
  /** Discriminator for different types of claims. */
  readonly type: T
  /**
   * Returns the underlying delegation this is based on
   */
  delegation() : Delegation
}

/** A claim not known to this library. */
export interface UnknownClaim extends ContentClaim<'unknown'> {}

/** A claim that a CID is available at a URL. */
export interface LocationClaim extends ContentClaim<typeof Assert.location.can>, Readonly<InferCaveats<AssertLocation>> {
}

/** A claim that a CID's graph can be read from the blocks found in parts. */
export interface PartitionClaim extends ContentClaim<typeof Assert.partition.can>, Readonly<InferCaveats<AssertPartition>> {
}

/** A claim that a CID includes the contents claimed in another CID. */
export interface InclusionClaim extends ContentClaim<typeof Assert.inclusion.can>, Readonly<InferCaveats<AssertInclusion>> {
}

/**
 * A claim that a content graph can be found in blob(s) that are identified and
 * indexed in the given index CID.
 */
export interface IndexClaim extends ContentClaim<typeof Assert.index.can>, Readonly<InferCaveats<AssertIndex>> {
}

/** A claim that a CID links to other CIDs. */
export interface RelationClaim extends ContentClaim<typeof Assert.relation.can>, Readonly<InferCaveats<AssertRelation>> {
}

/** A claim that the same data is referred to by another CID and/or multihash */
export interface EqualsClaim extends ContentClaim<typeof Assert.equals.can>, Readonly<InferCaveats<AssertEquals>> {
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
