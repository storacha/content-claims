export class S3Bucket {
  /** @type {import('@aws-sdk/client-s3').S3Client} */
  #s3Client
  /** @type {string} */
  #bucketName

  /**
   * @param {import('@aws-sdk/client-s3').S3Client} client
   * @param {string} bucketName
   */
  constructor (client, bucketName) {
    this.#s3Client = client
    this.#bucketName = bucketName
  }

  get s3Client () {
    return this.#s3Client
  }

  get bucketName () {
    return this.#bucketName
  }
}
