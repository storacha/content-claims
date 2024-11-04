<div align="center">
  <h1>🦪<br/>Content Claims</h1>
</div>

[![Test](https://github.com/storacha/content-claims/actions/workflows/test.yml/badge.svg)](https://github.com/storacha/content-claims/actions/workflows/test.yml)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Implementation of the Content Claims Protocol.


## Background

Read the [spec](https://hackmd.io/@gozala/content-claims).

### Supported claims

These are the types of claim that we're interested in from the spec:

#### Location claim

Claims that a CID is available at a URL.

Capability: `assert/location`

Input:

```js
{
  content: CID /* CAR CID */, 
  location: ['https://r2.cf/bag...car', 's3://bucket/bag...car'],
  range?: { offset: number, length?: number } /* Optional: Byte Range in URL */
}
```

#### Inclusion claim

Claims that a CID includes the contents claimed in another CID.

Capability: `assert/inclusion`

Input:

```js
{
  content: CID /* CAR CID */,
  includes: CID /* CARv2 Index CID */,
  proof?: CID /* Optional: zero-knowledge proof */
}
```

#### Index claim

Claims that a content graph can be found in blob(s) that are identified and indexed in the given index CID.

Capability: `assert/index`

Input:

```js
{
  content: CID /* CAR CID */,
  /**
   * Link to a Content Archive that contains the index.
   * e.g. `index/sharded/dag@0.1`:
   * @see https://github.com/storacha/specs/blob/main/w3-index.md
   */
  index: CID
}
```

#### Partition claim

Claims that a CID's graph can be read from the blocks found in parts.

Capability: `assert/partition`

Input:

```js
{
  content: CID /* Content Root CID */,
  blocks?: CID /* CIDs CID */,
  parts: [
    CID /* CAR CID */,
    CID /* CAR CID */,
    ...
  ]
}
```

#### Equivalency Claim

Claims that the same data is referred to by another CID and/or multihash. For example a CAR CID and it's CommP Piece CID.

Capability: `assert/equals`

Input:

```js
{
  content: CID /* CID */,
  equals: CID /* CID */
}
```

#### Relation claim 🆕

Claims that a CID links to other CIDs. Like a [partition claim](#partition-claim) crossed with an [inclusion claim](#inclusion-claim), a relation claim asserts that a block of content links to other blocks, and that the block and it's links may be found in the specified parts. Furthermore, for each part you can optionally specify an inline inclusion claim (specifying what is included in the part) and for each inclusion an optional inline partition claim (specifying parts in which the inclusion CID may be found).

Capability: `assert/relation`

Input:

```js
{
  content: CID /* Block CID */,
  children: [
    CID /* Linked block CID */,
    CID /* Linked block CID */,
    ...
  ],
  parts: [
    {
      content: CID /* CAR CID */,
      includes?: {
        content: CID /* CARv2 Index CID */,
        parts?: [
          CID /* CAR CID */,
          ...
        ]
      }
    },
    ...
  ]
}
```

## Usage

### Client libraries

Client libraries make reading and writing claims easier.

* [JavaScript client](https://www.npmjs.com/package/@web3-storage/content-claims)

### HTTP API

The production deployment is at https://claims.web3.storage.

#### `GET /claims/multihash/:multihash`

Fetch a CAR full of content claims for the base58 encoded (Multibase `base58btc`) content hash in the URL path.

Query parameters:

* `?walk=` - a CSV list of properties in claims to walk in order to return additional claims about the related CIDs. Any property that is a CID can be walked. e.g. `?walk=parts,includes`.

#### `GET /claims/cid/:cid`

As above, except passing a CID instead of multihash.

### CLI

There is a command line interface for invoking the HTTP API in [./packages/cli](./packages/cli).

It's published to npm, so if you have npm installed, you should be able to:
* run the cli with
  ```shell
  npx @web3-storage/content-claims-cli # args
  ```
* install the cli globally with
  ```shell
  npm install -g @web3-storage/content-claims-cli
  ```
  * then invoke it like this to see CAR bytes on stdout
    ```shell
    claim read bafybeifftytx763g6u5gvisyrng5de4wmxhwlc4sjxfhohmab6yjprcmbi --walk=parts,includes
    ```

For more CLI Usage instructions, see the [content-claims-cli README](./packages/cli/README.md)

## Getting started

The repo contains the infra deployment code and the service implementation.

```
├── packages   - content-claims core, CLI and AWS infra
└── stacks     - sst and AWS CDK code to deploy all the things
```

To work on this codebase **you need**:

- Node.js >= v18 (prod env is node v18)
- An AWS account with the AWS CLI configured locally
- Copy `.env.tpl` to `.env` and fill in the blanks
- Install the deps with `npm i`

Deploy dev services to your AWS account and start dev console. You may need to provide a `--profile` to pick the aws profile to deploy with.

```sh
npm start
```

See: https://docs.sst.dev for more info on how things get deployed.


### Environment variables

The following should be set in the env when deploying. Copy `.env.tpl` to `.env` to set in dev.

```sh
# Private key for the service.
PRIVATE_KEY=MgCblCY...
# Name of DynamoDB table for indexing claims.
CLAIM_TABLE=claim
# Region of the DynamoDB to query.
CLAIM_TABLE_REGION=us-west-2
# Name of the S3 bucket for storing signed claims.
CLAIM_BUCKET=claim
# Region of the claim bucket.
CLAIM_BUCKET_REGION=us-west-2
# (optional) Elastic IPFS DynamoDB block index table.
BLOCK_INDEX_TABLE=blocks-cars-position
# (optional) Elastic IPFS DynamoDB region.
BLOCK_INDEX_REGION=us-west-2
# (optional) Service DID, if using DID with method other than `key`.
SERVICE_DID=did:web:claims.web3.storage
# (optional) Sentry key for error reporting.
SENTRY_DSN=
```


#### `PRIVATE_KEY`

The [`multibase`](https://github.com/multiformats/multibase) encoded ED25519 keypair used as the signing key for content-claims.

Generated by [@ucanto/principal `EdSigner`](https://github.com/storacha/ucanto) via [`ucan-key`](https://www.npmjs.com/package/ucan-key)

_Example:_ `MgCZG7EvaA...1pX9as=`

#### `CLAIM_TABLE`

Name of DynamoDB table for indexing claims.

#### `CLAIM_TABLE_REGION`

Region of the DynamoDB to query.

#### `CLAIM_BUCKET`

Name of the S3 bucket for storing claims.

#### `CLAIM_BUCKET_REGION`

Region of the S3 bucket.

#### `BLOCK_INDEX_TABLE` (optional)

The Elastic IPFS DynamoDB block index table. If set and no other claim is found for a CID, the content claims API will query this table and materialize claims for any index data found. This is expected to be a table with the following structure:

```ts
interface BlockIndexTable {
  blockmultihash: string // base58btc encoded block multihash (partition key)
  carpath: string        // bucket key, format: `REGION/BUCKET_NAME/KEY.car`
  offset: number         // byte offset within CAR file
  length: number
}
```

Note: this table requires read-only access.

#### `BLOCK_INDEX_REGION` (optional)

Region of the DynamoDB that houses the block index table (set if different from `CLAIM_TABLE_REGION`).

#### `SERVICE_DID` (optional)

The DID of the service, if using DID with method other than `key`.

#### `SERVICE_URL` (optional)

The URL of the deployed service.

#### `SENTRY_DSN` (optional)

Data source name for Sentry application monitoring service.


### Secrets

Set production secrets in AWS SSM via [`sst secrets`](https://docs.sst.dev/config#sst-secrets). The region must be set to the one you deploy that stage to:

```sh
# set `PRIVATE_KEY` for prod
$ npx sst secrets set --region us-west-2 --stage prod PRIVATE_KEY "MgCblCY...="
```

To set a fallback value for `staging` or an ephemeral PR build use [`sst secrets set --fallback`](https://docs.sst.dev/config#fallback-values)

```sh
# set `PRIVATE_KEY` for any stage in us-east-2
$ npx sst secrets set --region us-east-2 --fallback PRIVATE_KEY "MgCZG7...="
```

**note** The fallback value can only be inherited by stages deployed in the same AWS account and region.

Confirm the secret value using [`sst secrets list`](https://docs.sst.dev/config#sst-secrets)

```sh
$ npx sst secrets list --region us-east-2
PRIVATE_KEY MgCZG7...= (fallback)

$ npx sst secrets list --region us-west-2 --stage prod
PRIVATE_KEY M...=
```


### DynamoDB tables

```ts
interface ClaimTable {
  /** CID of the UCAN invocation task we received this claim in. */
  claim: string // Note: sort key

  /** The subject of the claim (base58 encoded multihash). */
  content: string // Note: partition key

  /** UCAN expiration */
  expiration: number
}
```

### S3 buckets

Signed claim data is stored in an S3 bucket with the following key format:

```
<CLAIM_CID>/<CLAIM_CID>.car
```

Note: CID is base32 encoded.

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/storacha/content-claims/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/storacha/content-claims/blob/main/LICENSE.md)
