import { createService as createAssertService } from './assert.js'

/**
 * @param {import('./api').ServiceContext} context
 * @returns {import('./api').Service}
 */
export const createService = context => ({
  assert: createAssertService(context)
})
