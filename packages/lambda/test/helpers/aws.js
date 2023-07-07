import { GenericContainer } from 'testcontainers'
import { customAlphabet } from 'nanoid'
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb'

const id = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)
const credentials = { accessKeyId: 'minioadmin', secretAccessKey: 'minioadmin' }

/**
 * @template T
 * @typedef {{
 *   client: T
 *   container: import('testcontainers').StartedTestContainer
 *   region: string
 *   endpoint: string
 *   credentials: { accessKeyId: string, secretAccessKey: string }
 * }} TestAwsService
 */

/**
 * @param {object} [opts]
 * @param {number} [opts.port]
 * @param {string} [opts.region]
 */
export async function createDynamo (opts) {
  console.log('Creating local DynamoDB...')
  const port = opts?.port ?? 8000
  const region = opts?.region ?? 'us-west-2'
  const container = await new GenericContainer('amazon/dynamodb-local:latest')
    .withExposedPorts(port)
    .start()

  const clientOpts = {
    endpoint: `http://127.0.0.1:${container.getMappedPort(8000)}`,
    region,
    credentials
  }

  return { container, client: new DynamoDBClient(clientOpts), ...clientOpts }
}

/**
 * @param {import("@aws-sdk/client-dynamodb").DynamoDBClient} dynamo
 */
export async function createDynamoTable (dynamo) {
  const name = id()
  console.log(`Creating DynamoDB table "${name}"...`)

  await dynamo.send(
    new CreateTableCommand({
      TableName: name,
      AttributeDefinitions: [
        { AttributeName: 'content', AttributeType: 'S' },
        { AttributeName: 'claim', AttributeType: 'S' }
      ],
      KeySchema: [
        { AttributeName: 'content', KeyType: 'HASH' },
        { AttributeName: 'claim', KeyType: 'RANGE' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      }
    })
  )

  return name
}
