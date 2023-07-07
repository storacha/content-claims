import { Table } from 'sst/constructs'

/**
 * @param {import('sst/constructs').StackContext} config
 */
export function DB ({ stack }) {
  const locationTable = new Table(stack, 'locationClaim', {
    fields: {
      claim: 'string',
      content: 'string'
    },
    primaryIndex: { partitionKey: 'content', sortKey: 'claim' }
  })
  const partitionTable = new Table(stack, 'partitionClaim', {
    fields: {
      claim: 'string',
      content: 'string'
    },
    primaryIndex: { partitionKey: 'content', sortKey: 'claim' }
  })
  const inclusionTable = new Table(stack, 'inclusionClaim', {
    fields: {
      claim: 'string',
      content: 'string'
    },
    primaryIndex: { partitionKey: 'content', sortKey: 'claim' }
  })
  const relationTable = new Table(stack, 'relationClaim', {
    fields: {
      claim: 'string',
      content: 'string'
    },
    primaryIndex: { partitionKey: 'content', sortKey: 'claim' }
  })

  return {
    locationTable,
    partitionTable,
    inclusionTable,
    relationTable
  }
}
