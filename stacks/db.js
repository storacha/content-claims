import { Table } from 'sst/constructs'

/**
 * @param {import('sst/constructs').StackContext} config
 */
export function DB ({ stack }) {
  const locationTable = new Table(stack, 'locationClaim', {
    fields: { content: 'string' },
    primaryIndex: { partitionKey: 'content' }
  })
  const partitionTable = new Table(stack, 'partitionClaim', {
    fields: { content: 'string' },
    primaryIndex: { partitionKey: 'content' }
  })
  const inclusionTable = new Table(stack, 'inclusionClaim', {
    fields: { content: 'string' },
    primaryIndex: { partitionKey: 'content' }
  })
  const relationTable = new Table(stack, 'relationClaim', {
    fields: { parent: 'string' },
    primaryIndex: { partitionKey: 'parent' }
  })

  return {
    locationTable,
    partitionTable,
    inclusionTable,
    relationTable
  }
}
