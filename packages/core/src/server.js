import * as Server from '@ucanto/server'
import { createService } from './service/index.js'

/**
 * @param {import('./service/index.js').ServiceContext & {
 *   id: import('@ucanto/server').Signer
 *   codec: import('@ucanto/server').InboundCodec
 *   errorReporter?: { catch: (err: import('@ucanto/server').HandlerExecutionError) => void }
 * }} config
 */
export const createServer = ({ id, codec, errorReporter: errorHandler, ...context }) =>
  Server.create({
    id,
    codec,
    service: createService(context),
    catch: errorHandler?.catch
  })
