import { Table } from 'sst/constructs'

/**
 * @param {import('sst/constructs').StackContext} config
 */
export function DB ({ stack }) {
  const locationTable = new Table(stack, 'location', {
    fields: {
      claim: 'string',
      content: 'string'
    },
    primaryIndex: { partitionKey: 'content', sortKey: 'claim' }
  })
  const partitionTable = new Table(stack, 'partition', {
    fields: {
      claim: 'string',
      content: 'string'
    },
    primaryIndex: { partitionKey: 'content', sortKey: 'claim' }
  })
  const inclusionTable = new Table(stack, 'inclusion', {
    fields: {
      claim: 'string',
      content: 'string'
    },
    primaryIndex: { partitionKey: 'content', sortKey: 'claim' }
  })
  const relationTable = new Table(stack, 'relation', {
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
