import { Failure, ServiceMethod } from '@ucanto/server'
import { AssertInclusion, AssertIndex, AssertLocation, AssertPartition, AssertRelation, AssertEquals } from '../../capability/api.js'
import { ClaimStore } from '../api.js'

export type AnyAssertCap = AssertInclusion | AssertIndex | AssertLocation | AssertPartition | AssertRelation | AssertEquals

export interface AssertServiceContext {
  claimStore: ClaimStore
}

export interface AssertService {
  location: ServiceMethod<AssertLocation, {}, Failure>
  inclusion: ServiceMethod<AssertInclusion, {}, Failure>
  index: ServiceMethod<AssertIndex, {}, Failure>
  partition: ServiceMethod<AssertPartition, {}, Failure>
  relation: ServiceMethod<AssertRelation, {}, Failure>
  equals: ServiceMethod<AssertEquals, {}, Failure>
}

export interface ServiceContext extends AssertServiceContext {}

export interface Service {
  assert: AssertService
}
