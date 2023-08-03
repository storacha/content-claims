import { Table } from 'sst/constructs'

/**
 * @param {import('sst/constructs').StackContext} config
 */
export function DB ({ stack }) {
  const claimsTable = new Table(stack, 'claims-v1', {
    fields: {
      claim: 'string',
      content: 'string',
      expiration: 'number'
    },
    primaryIndex: { partitionKey: 'content', sortKey: 'claim' },
    timeToLiveAttribute: 'expiration'
  })

  return { claimsTable }
}
