import { DID } from '@ucanto/server'
import * as ed25519 from '@ucanto/principal/ed25519'
import { S3Client } from '@aws-sdk/client-s3'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

/**
 * Given a config, return a ucanto Signer object representing the service
 *
 * @param {object} config
 * @param {string} config.privateKey - multiformats private key of primary signing key
 * @param {string} [config.serviceDID] - public DID for the upload service (did:key:... derived from PRIVATE_KEY if not set)
 * @returns {import('@ucanto/principal/ed25519').Signer.Signer}
 */
export function getServiceSigner (config) {
  const signer = ed25519.parse(config.privateKey)
  if (config.serviceDID) {
    const did = DID.parse(config.serviceDID).did()
    return signer.withDID(did)
  }
  return signer
}

/**
 * @template T
 * @param {string} key
 * @param {Record<string, T>} obj
 */
export function notNully (key, obj) {
  const value = obj[key]
  if (value == null) throw new Error(`unexpected null/undefined key in object: ${key}`)
  return value
}

/** @type {Record<string, import('@aws-sdk/client-dynamodb').DynamoDBClient>} */
const dynamoClients = {}

/** @param {string} region */
export function getDynamoClient (region) {
  if (!dynamoClients[region]) {
    dynamoClients[region] = new DynamoDBClient({ region })
  }
  return dynamoClients[region]
}

/** @type {Record<string, import('@aws-sdk/client-s3').S3Client>} */
const s3Clients = {}

/** @param {string} region */
export function getS3Client (region) {
  if (!s3Clients[region]) {
    s3Clients[region] = new S3Client({ region })
  }
  return s3Clients[region]
}
