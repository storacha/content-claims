import { Table } from 'sst/constructs'
import { tableProps } from '../packages/infra/src/lib/store/index.js'

/**
 * @param {import('sst/constructs').StackContext} config
 */
export function DB ({ stack }) {
  const claimsTable = new Table(
    stack,
    'claims-v1',
    /** @type {import('sst/constructs').TableProps} */
    (tableProps)
  )

  return { claimsTable }
}
