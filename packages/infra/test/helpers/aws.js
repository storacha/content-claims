import { GenericContainer } from 'testcontainers'
import { customAlphabet } from 'nanoid'
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb'
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3'

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
    endpoint: `http://127.0.0.1:${container.getMappedPort(port)}`,
    region,
    credentials
  }

  return { container, client: new DynamoDBClient(clientOpts), ...clientOpts }
}

/** @param {DynamoDBClient} dynamo */
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

/** @param {DynamoDBClient} dynamo */
export async function createDynamoBlocksTable (dynamo) {
  const name = id()
  console.log(`Creating DynamoDB blocks table "${name}"...`)

  await dynamo.send(
    new CreateTableCommand({
      TableName: name,
      AttributeDefinitions: [
        { AttributeName: 'blockmultihash', AttributeType: 'S' },
        { AttributeName: 'carpath', AttributeType: 'S' }
      ],
      KeySchema: [
        { AttributeName: 'blockmultihash', KeyType: 'HASH' },
        { AttributeName: 'carpath', KeyType: 'RANGE' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      }
    })
  )

  return name
}

/**
 * @param {object} [opts]
 * @param {number} [opts.port]
 * @param {string} [opts.region]
 */
export async function createS3 (opts = {}) {
  console.log('Creating local S3...')
  const region = opts.region || 'us-west-2'
  const port = opts.port || 9000

  const container = await new GenericContainer('quay.io/minio/minio')
    .withCommand(['server', '/data'])
    .withExposedPorts(port)
    .start()

  const clientOpts = {
    endpoint: `http://127.0.0.1:${container.getMappedPort(port)}`,
    forcePathStyle: true,
    region,
    credentials
  }

  return { container, client: new S3Client(clientOpts), ...clientOpts }
}

/** @param {S3Client} s3 */
export async function createS3Bucket (s3) {
  const name = id()
  console.log(`Creating S3 bucket "${name}"...`)
  await s3.send(new CreateBucketCommand({ Bucket: name }))
  return name
}
