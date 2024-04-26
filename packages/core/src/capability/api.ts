import * as ucanto from '@ucanto/interface'
import { assert, equals, inclusion, location, partition } from './assert.js'

export type Assert = ucanto.InferInvokedCapability<typeof assert>
export type AssertInclusion = ucanto.InferInvokedCapability<typeof inclusion>
export type AssertLocation = ucanto.InferInvokedCapability<typeof location>
export type AssertPartition = ucanto.InferInvokedCapability<typeof partition>
export type AssertEquals = ucanto.InferInvokedCapability<typeof equals>
