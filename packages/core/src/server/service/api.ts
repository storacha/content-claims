import { Failure, ServiceMethod } from '@ucanto/server'
import { AssertInclusion, AssertLocation, AssertPartition, AssertEquals } from '../../capability/api.js'
import { ClaimStore } from '../api.js'

export type AnyAssertCap = AssertInclusion | AssertLocation | AssertPartition | AssertEquals

export interface AssertServiceContext {
  claimStore: ClaimStore
}

export interface AssertService {
  location: ServiceMethod<AssertLocation, {}, Failure>
  inclusion: ServiceMethod<AssertInclusion, {}, Failure>
  partition: ServiceMethod<AssertPartition, {}, Failure>
  equals: ServiceMethod<AssertEquals, {}, Failure>
}

export interface ServiceContext extends AssertServiceContext {}

export interface Service {
  assert: AssertService
}
