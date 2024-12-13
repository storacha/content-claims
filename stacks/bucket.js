import { Bucket as S3Bucket } from 'sst/constructs'
import { PolicyStatement, StarPrincipal, Effect } from 'aws-cdk-lib/aws-iam'

/**
 * @param {import('sst/constructs').StackContext} config
 */
export function Bucket ({ stack }) {
  const claimsBucket = new S3Bucket(stack, 'claims-v1', {
    cors: true,
    cdk: {
      bucket: {
        blockPublicAccess: {
          // do not allow ACLs
          blockPublicAcls: true,
          ignorePublicAcls: true,
          // allow public policy
          blockPublicPolicy: false,
          restrictPublicBuckets: false
        }
      }
    }
  })
  // Add policy to bucket for `s3:GetObject` command
  claimsBucket.cdk.bucket.addToResourcePolicy(
    new PolicyStatement({
      actions: ['s3:GetObject'],
      effect: Effect.ALLOW,
      principals: [new StarPrincipal()],
      resources: [claimsBucket.cdk.bucket.arnForObjects('*')]
    })
  )
  return { claimsBucket }
}
