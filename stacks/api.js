import dotenv from 'dotenv'
import * as cdk from 'aws-cdk-lib/core'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets'
import { Function, Config, use } from 'sst/constructs'
import { getApiPackageJson, getGitInfo, domainForStage } from './config.js'
import { DB } from './db.js'

dotenv.config()

/**
 * @param {import('sst/constructs').StackContext} config
 */
export function API ({ stack }) {
  const { SENTRY_DSN, DYNAMO_REGION, HOSTED_ZONE, HOSTED_ZONE_ID, SERVICE_DID } = process.env
  if (!DYNAMO_REGION) throw new Error('DYNAMO_REGION required in env')
  if ((HOSTED_ZONE && !HOSTED_ZONE_ID) || (!HOSTED_ZONE && HOSTED_ZONE_ID)) {
    throw new Error('Both HOSTED_ZONE and HOSTED_ZONE_ID must be set to enable a custom domain')
  }

  const privateKey = new Config.Secret(stack, 'PRIVATE_KEY')
  const pkg = getApiPackageJson()
  const git = getGitInfo()

  stack.setDefaultFunctionProps({
    memorySize: '1 GB',
    runtime: 'nodejs18.x',
    architecture: 'arm_64',
    timeout: '15 minutes'
  })

  const { claimsTable } = use(DB)

  const fun = new Function(stack, 'fn', {
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
      DYNAMO_REGION,
      CLAIM_TABLE: claimsTable.tableName,
      SERVICE_DID: SERVICE_DID ?? ''
    },
    bind: [privateKey]
  })

  fun.attachPermissions([
    's3:GetObject',
    'dynamodb:Query',
    'dynamodb:UpdateItem'
  ])

  if (!fun.url) {
    throw new Error('Lambda Function URL is required to create cloudfront distribution')
  }

  if (!HOSTED_ZONE || !HOSTED_ZONE_ID) {
    stack.addOutputs({
      functionUrl: fun.url
    })
    return
  }

  // <stage>.claims.web3.storage | claims.web3.storage
  const domainName = domainForStage(stack.stage, HOSTED_ZONE)

  // Import existing Zone
  const hostedZone = route53.HostedZone.fromHostedZoneAttributes(stack, 'fun-zone', {
    zoneName: `${HOSTED_ZONE}.`,
    hostedZoneId: HOSTED_ZONE_ID
  })

  /**
   * We have to use the deprecated `DnsValidatedCertificate` construct here
   * - cloudfront *requires* that certs be created in `us-east-1`
   * - no other construct allows us to specify the region for the cert.
   *
   * the recommended replacement does not let us set the region for the cert:
   *
   *  const cert = new acm.Certificate(stack, 'fun-cert', {
   *    domainName,
   *    validation: acm.CertificateValidation.fromDns(hostedZone)
   *  })
   */
  const cert = new acm.DnsValidatedCertificate(stack, 'fun-cert', {
    region: 'us-east-1',
    hostedZone,
    domainName: HOSTED_ZONE,
    subjectAlternativeNames: [`*.${HOSTED_ZONE}`]
  })

  // create cloudfront dist to sit in front of lambda url
  const dist = new cloudfront.Distribution(stack, 'fun-dist', {
    certificate: cert,
    domainNames: [domainName],
    defaultBehavior: {
      compress: true,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      // fun.url is a placeholder at synth time...
      // you have to do this horror to get the hostname from the url at deploy time
      // see: https://github.com/aws/aws-cdk/blob/08ad189719f9fb3d9207f2b960ceeb7d0bd7b82b/packages/aws-cdk-lib/aws-cloudfront-origins/lib/rest-api-origin.ts#L39-L42
      origin: new origins.HttpOrigin(cdk.Fn.select(2, cdk.Fn.split('/', fun.url)))
    }
  })

  // eslint-disable-next-line
  const dns = new route53.ARecord(stack, 'fun-dns', {
    zone: hostedZone,
    recordName: domainName,
    target: route53.RecordTarget.fromAlias(new CloudFrontTarget(dist))
  })

  stack.addOutputs({
    url: `https://${dns.domainName}`,
    functionUrl: fun.url,
    functionName: fun.functionName,
    cloudfrontUrl: `https://${dist.distributionDomainName}`
  })
}
