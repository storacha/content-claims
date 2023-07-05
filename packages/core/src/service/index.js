import { createService as createAssertService } from './assert/index.js'

/**
 * @typedef {import('./assert/index').AssertServiceContext} ServiceContext
 * @typedef {{ assert: import('./assert/index').AssertService }} Service
 */

/**
 * @param {ServiceContext} context
 * @returns {Service}
 */
export const createService = context => ({
  assert: createAssertService(context)
})
