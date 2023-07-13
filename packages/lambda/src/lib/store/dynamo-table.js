export class DynamoTable {
  /** @type {import('@aws-sdk/client-dynamodb').DynamoDBClient} */
  #dynamoClient
  /** @type {string} */
  #tableName

  /**
   * @param {import('@aws-sdk/client-dynamodb').DynamoDBClient} client
   * @param {string} tableName
   */
  constructor (client, tableName) {
    this.#dynamoClient = client
    this.#tableName = tableName
  }

  get dynamoClient () {
    return this.#dynamoClient
  }

  get tableName () {
    return this.#tableName
  }
}
