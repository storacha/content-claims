import { createService as createAssertService } from './assert.js'

/**
 * @param {import('./api.js').ServiceContext} context
 * @returns {import('./api.js').Service}
 */
export const createService = context => ({
  assert: createAssertService(context)
})
