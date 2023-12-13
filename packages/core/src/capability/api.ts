import * as ucanto from '@ucanto/interface'
import { assert, equals, inclusion, location, partition, relation } from './assert.js'

export type Assert = ucanto.InferInvokedCapability<typeof assert>
export type AssertInclusion = ucanto.InferInvokedCapability<typeof inclusion>
export type AssertLocation = ucanto.InferInvokedCapability<typeof location>
export type AssertPartition = ucanto.InferInvokedCapability<typeof partition>
export type AssertRelation = ucanto.InferInvokedCapability<typeof relation>
export type AssertEquals = ucanto.InferInvokedCapability<typeof equals>
