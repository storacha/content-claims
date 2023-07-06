import { Table } from 'sst/constructs'

/**
 * @param {import('sst/constructs').StackContext} config
 */
export function DB ({ stack }) {
  const locationTable = new Table(stack, 'locationClaim', {
    fields: {
      invocation: 'string',
      content: 'string'
    },
    primaryIndex: { partitionKey: 'content', sortKey: 'invocation' }
  })
  const partitionTable = new Table(stack, 'partitionClaim', {
    fields: {
      invocation: 'string',
      content: 'string'
    },
    primaryIndex: { partitionKey: 'content', sortKey: 'invocation' }
  })
  const inclusionTable = new Table(stack, 'inclusionClaim', {
    fields: {
      invocation: 'string',
      content: 'string'
    },
    primaryIndex: { partitionKey: 'content', sortKey: 'invocation' }
  })
  const relationTable = new Table(stack, 'relationClaim', {
    fields: {
      invocation: 'string',
      content: 'string'
    },
    primaryIndex: { partitionKey: 'parent' }
  })

  return {
    locationTable,
    partitionTable,
    inclusionTable,
    relationTable
  }
}
