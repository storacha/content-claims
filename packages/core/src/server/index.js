import * as Server from '@ucanto/server'
import { createService } from './service/index.js'

/** @typedef {import('@ucanto/interface').ServerView<import('./service/api').Service>} Server */

/**
 * @param {import('./service/api').ServiceContext & {
 *   id: import('@ucanto/server').Signer
 *   codec: import('@ucanto/server').InboundCodec
 *   errorReporter?: { catch: (err: import('@ucanto/server').HandlerExecutionError) => void }
 * }} config
 * @returns {Server}
 */
export const createServer = ({ id, codec, errorReporter: errorHandler, ...context }) =>
  Server.create({
    id,
    codec,
    service: createService(context),
    catch: errorHandler?.catch
  })
