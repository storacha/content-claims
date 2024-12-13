import { Bucket as S3Bucket } from 'sst/constructs'

/**
 * @param {import('sst/constructs').StackContext} config
 */
export function Bucket ({ stack }) {
  const claimsBucket = new S3Bucket(stack, 'claims-v1', {
    cors: true,
    cdk: {
      bucket: {
        blockPublicAccess: {
          // do not allow public write access
          blockPublicAcls: true,
          ignorePublicAcls: true,
          // allow public read access
          blockPublicPolicy: false,
          restrictPublicBuckets: false,
        }
      }
    }
  })
  return { claimsBucket }
}
