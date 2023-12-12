import * as Server from '@ucanto/server'
import { createService } from './service/index.js'

/** @typedef {import('@ucanto/interface').ServerView<import('./service/api.js').Service>} Server */

/**
 * @param {import('./service/api.js').ServiceContext & {
 *   id: import('@ucanto/server').Signer
 *   codec: import('@ucanto/server').InboundCodec
 *   validateAuthorization: import('@ucanto/interface').RevocationChecker['validateAuthorization']
 *   errorReporter?: { catch: (err: import('@ucanto/server').HandlerExecutionError) => void }
 * }} config
 * @returns {Server}
 */
export const createServer = ({ id, codec, errorReporter: errorHandler, validateAuthorization, ...context }) =>
  Server.create({
    id,
    codec,
    service: createService(context),
    catch: errorHandler?.catch,
    validateAuthorization
  })
