import { Function } from 'sst/constructs'
import { getApiPackageJson, getGitInfo } from './config.js'
import dotenv from 'dotenv'

dotenv.config()

/**
 * @param {import('sst/constructs').StackContext} config
 */
export function API ({ stack }) {
  const { SENTRY_DSN, DYNAMO_REGION, PRIVATE_KEY } = process.env
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY required in env')
  if (!DYNAMO_REGION) throw new Error('DYNAMO_REGION required in env')

  const pkg = getApiPackageJson()
  const git = getGitInfo()
  stack.setDefaultFunctionProps({
    memorySize: '1 GB',
    runtime: 'nodejs18.x',
    architecture: 'arm_64',
    timeout: '15 minutes'
  })

  const fn = new Function(stack, 'fn', {
    handler: 'packages/lambda/src/content-claims.handler',
    url: {
      cors: true,
      authorizer: 'none'
    },
    environment: {
      NAME: pkg.name,
      REPO: pkg.homepage,
      VERSION: pkg.version,
      BRANCH: git.branch,
      COMMIT: git.commit,
      STAGE: stack.stage,
      SENTRY_DSN: SENTRY_DSN ?? '',
      DYNAMO_REGION
    }
  })

  fn.attachPermissions([
    's3:GetObject',
    'dynamodb:Query',
    'dynamodb:GetItem',
    'dynamodb:PutItem',
    'dynamodb:BatchWriteItem'
  ])

  stack.addOutputs({
    URL: fn.url
  })
}
