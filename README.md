# Content Claims

[![Build](https://github.com/web3-storage/content-claims/actions/workflows/build.yml/badge.svg)](https://github.com/web3-storage/content-claims/actions/workflows/build.yml)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Implementation of the Content Claims Protocol.

Read the [spec](https://hackmd.io/@gozala/content-claims).


## Getting Started

The repo contains the infra deployment code and the service implementation.

```
├── packages   - content-claims core and lambda wrapper
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


## Environment variables

The following should be set in the env when deploying. Copy `.env.tpl` to `.env` to set in dev.

```sh
SENTRY_DSN=<your error reporting key here>

# Region of the DynamoDB to query
DYNAMO_REGION=us-west-2
```


## Supported claims

These are the types of claim that we're interested in from the spec:

### Location claim

Capability: `assert/location`

Input:

```js
{
  "content": CID /* CAR CID */, 
  "location": ["https://r2.cf/bag...car", "s3://bucket/bag...car"],
  "range": { "offset": 0 } /* Optional: Byte Range in URL */
}
```

### Inclusion claim

Claims that within a CAR, there are a bunch of CIDs (and their offsets).

Capability: `assert/inclusion`

Input:

```js
{
  "content": CID /* CAR CID */,
  "includes": CID /* CARv2 Index CID */,
  "proof": CID /* Optional: zero-knowledge proof */
}
```

### Partition claim

Claims that a DAG can be found in a bunch of CAR files.

Capability: `assert/partition`

Input:

```js
{
  "content": CID /* Content Root CID */,
  "blocks": CID, /* CIDs CID */
  "parts": [
    CID /* CAR CID */,
    CID /* CAR CID */,
    ...
  ]
}
```

### Relation claim 🆕

Claims that a block of content links to other blocks.

Capability: `assert/relation`

Input:

```js
{
  "parent": CID /* Block CID */,
  "child": [
    CID /* Linked block CID */,
    CID /* Linked block CID */,
    ...
  ]
}
```

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/content-claims/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/content-claims/blob/main/LICENSE.md)
