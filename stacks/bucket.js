import { Bucket as S3Bucket } from 'sst/constructs'

/**
 * @param {import('sst/constructs').StackContext} config
 */
export function Bucket ({ stack }) {
  const claimsBucket = new S3Bucket(stack, 'claims-v1')
  return { claimsBucket }
}
