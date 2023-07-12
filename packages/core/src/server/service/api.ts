import { Failure, ServiceMethod } from '@ucanto/server'
import { AssertInclusion, AssertLocation, AssertPartition, AssertRelation } from '../../capability/assert.js'
import { ClaimStore } from '../api.js'

export interface AssertServiceContext {
  claimStore: ClaimStore
}

export interface AssertService {
  location: ServiceMethod<AssertLocation, {}, Failure>
  inclusion: ServiceMethod<AssertInclusion, {}, Failure>
  partition: ServiceMethod<AssertPartition, {}, Failure>
  relation: ServiceMethod<AssertRelation, {}, Failure>
}

export interface ServiceContext extends AssertServiceContext {}

export interface Service {
  assert: AssertService
}