#!/usr/bin/env node
/* global WritableStream */
import sade from 'sade'
import dotenv from 'dotenv'
import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspect } from 'node:util'
import { Writable } from 'node:stream'
import * as Link from 'multiformats/link'
import * as ed25519 from '@ucanto/principal/ed25519'
import { DID, UCAN } from '@ucanto/core'
import * as Delegation from '@ucanto/core/delegation'
import { CAR, HTTP } from '@ucanto/transport'
import * as Client from '@web3-storage/content-claims/client'
import { Assert } from '@web3-storage/content-claims/capability'
import { CARReaderStream } from 'carstream'
import duration from 'parse-duration'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env') })

const serviceURL = new URL(process.env.SERVICE_URL ?? 'https://claims.web3.storage')
const servicePrincipal = DID.parse(process.env.SERVICE_DID ?? 'did:web:claims.web3.storage')

if (servicePrincipal.did() !== 'did:web:claims.web3.storage') {
  console.warn(`WARN: using ${servicePrincipal.did()}`)
}

const connection = Client.connect({
  id: servicePrincipal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: serviceURL,
    method: 'POST'
  })
})

const prog = sade('claim').version('0.0.0')

prog
  .command('location <content> <url>')
  .describe('Generate a location claim that asserts the content (CAR CID) can be found at the URLs.')
  .option('-o, --output', 'Write output to this file.')
  .option('-e, --expire', 'Duration after which claim expires e.g \'1min\' or \'1hr\'', '30s')
  .example('location bagbaierae3n6cey3feykv3h5imue3eustl656dajifuddj3zedhpdofje3za https://s3.url/bagbaierae3n6cey3feykv3h5imue3eustl656dajifuddj3zedhpdofje3za.car -o location.claim')
  .action(async (contentArg, urlArg, opts) => {
    const content = Link.parse(contentArg)
    const urls = [urlArg, ...opts._]
    const signer = getSigner()

    const invocation = Assert.location.invoke({
      issuer: signer,
      audience: servicePrincipal,
      with: signer.did(),
      nb: { content, location: urls },
      expiration: toUcanExpiration(opts.expire)
    })
    await archiveClaim(invocation, opts.output)
  })
  .command('partition <content> <part>')
  .describe('Generate a partition claim that asserts the content (DAG root CID) exists in the parts (CAR CIDs).')
  .option('-o, --output', 'Write output to this file.')
  .option('-e, --expire', 'Duration after which claim expires e.g \'1min\' or \'1hr\'', '30s')
  .example('partition bafybeiefif6pfs25c6g5r4lcvsk7l6f3vnnsuziitrlca3g6rhjkhmysna bagbaierae3n6cey3feykv3h5imue3eustl656dajifuddj3zedhpdofje3za -o partition.claim')
  .action(async (contentArg, partArg, opts) => {
    const content = Link.parse(contentArg)
    const parts = [partArg, ...opts._].map(p => Link.parse(p).toV1())
    const signer = getSigner()

    const invocation = Assert.partition.invoke({
      issuer: signer,
      audience: servicePrincipal,
      with: signer.did(),
      nb: { content, parts },
      expiration: toUcanExpiration(opts.expire)
    })
    await archiveClaim(invocation, opts.output)
  })
  .command('inclusion <content> <includes>')
  .describe('Generate an inclusion claim that asserts the content (CAR CID) includes the blocks in the index (CARv2 index CID).')
  .option('-o, --output', 'Write output to this file.')
  .option('-e, --expire', 'Duration after which claim expires e.g \'1min\' or \'1hr\'', '30s')
  .example('inclusion bagbaierae3n6cey3feykv3h5imue3eustl656dajifuddj3zedhpdofje3za bafkreihyikwmd6vlp5g6snhqipvigffx3w52l322dtqlrf4phanxisa34m -o inclusion.claim')
  .action(async (contentArg, includesArg, opts) => {
    const content = Link.parse(contentArg)
    const includes = Link.parse(includesArg).toV1()
    const signer = getSigner()

    const invocation = Assert.inclusion.invoke({
      issuer: signer,
      audience: servicePrincipal,
      with: signer.did(),
      nb: { content, includes },
      expiration: toUcanExpiration(opts.expire)
    })
    await archiveClaim(invocation, opts.output)
  })
  .command('index <content> <index>')
  .describe('Generate an index claim that asserts a content graph can be found in blob(s) that are identified and indexed in the given index CID.')
  .option('-o, --output', 'Write output to this file.')
  .option('-e, --expire', 'Duration after which claim expires e.g \'1min\' or \'1hr\'', '30s')
  .example('index bafyreib7pboydxne2smyrq2lhtgw6y3jcvutzsyhoti7qs3ci6q45x7cky bagbaiera7hndiywftjuayz44kxl2l3skjquhizgnycykc2lhzbhuxtribwaq -o index.claim')
  .action(async (contentArg, includesArg, opts) => {
    const content = Link.parse(contentArg)
    const index = Link.parse(includesArg).toV1()
    const signer = getSigner()

    const invocation = Assert.index.invoke({
      issuer: signer,
      audience: servicePrincipal,
      with: signer.did(),
      nb: { content, index },
      expiration: toUcanExpiration(opts.expire)
    })
    await archiveClaim(invocation, opts.output)
  })
  .command('relation <content>')
  .describe('Generate a relation claim that asserts the content (block CID) links directly to the child (block CID).')
  .option('-c, --child', 'One or more child CIDs that this content links to.')
  .option('-p, --part', 'One or more CAR CIDs where the content and it\'s children may be found.')
  .option('-i, --includes', 'One or more CARv2 CIDs corresponding to the parts.')
  .option('-a, --includes-part', 'One or more CAR CIDs where the inclusion CID may be found.')
  .option('-o, --output', 'Write output to this file.')
  .option('-e, --expire', 'Duration after which claim expires e.g \'1min\' or \'1hr\'', '30s')
  .example('relation bagbaierae3n6cey3feykv3h5imue3eustl656dajifuddj3zedhpdofje3za --child bafkreihyikwmd6vlp5g6snhqipvigffx3w52l322dtqlrf4phanxisa34m --part -o relation.claim')
  .action(async (contentArg, opts) => {
    const content = Link.parse(contentArg)
    /** @type {import('multiformats/link').UnknownLink[]} */
    const children = (Array.isArray(opts.child) ? opts.child : [opts.child]).map(c => Link.parse(c))
    /** @type {import('multiformats/link').Link[]} */
    const partContents = (Array.isArray(opts.part) ? opts.part : [opts.part]).map(p => Link.parse(p))
    /** @type {import('multiformats/link').Link[]} */
    const partIncludes = (Array.isArray(opts.includes) ? opts.includes : [opts.includes]).filter(Boolean).map(i => Link.parse(i))
    /** @type {import('multiformats/link').Link[]} */
    const partIncludesPart = (Array.isArray(opts['includes-part']) ? opts['includes-part'] : [opts['includes-part']]).filter(Boolean).map(i => Link.parse(i))

    const parts = partContents.map((content, i) => {
      const includes = partIncludes[i]
      if (!includes) return { content }
      const includesPart = partIncludesPart[i]
      if (!includesPart) return { content, includes: { content: includes } }
      return { content, includes: { content: includes, parts: [includesPart] } }
    })

    const signer = getSigner()

    const invocation = Assert.relation.invoke({
      issuer: signer,
      audience: servicePrincipal,
      with: signer.did(),
      nb: { content, children, parts },
      expiration: toUcanExpiration(opts.expire)
    })
    await archiveClaim(invocation, opts.output)
  })
  .command('equals <content> <equal>')
  .describe('Generate an equals claim that asserts the content is referred to by another CID and/or multihash.')
  .option('-o, --output', 'Write output to this file.')
  .option('-e, --expire', 'Duration after which claim expires e.g \'1min\' or \'1hr\'', '30s')
  .example('equals QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354 -o equals.claim')
  .action(async (contentArg, equalsArg, opts) => {
    const content = Link.parse(contentArg)
    const equals = Link.parse(equalsArg)
    const signer = getSigner()

    const invocation = Assert.equals.invoke({
      issuer: signer,
      audience: servicePrincipal,
      with: signer.did(),
      nb: { content, equals },
      expiration: toUcanExpiration(opts.expire)
    })
    await archiveClaim(invocation, opts.output)
  })
  .command('inspect <claim>')
  .describe('Inspect a generated claim.')
  .action(async path => {
    const archive = await fs.promises.readFile(path)
    const delegation = await Delegation.extract(archive)
    if (!delegation.ok) throw new Error('failed to extract archive', { cause: delegation.error })
    console.log(inspect(JSON.parse(JSON.stringify(delegation.ok)), false, Infinity, process.stdout.isTTY))
  })
  .command('write <claim>')
  .describe('Write claims to claims.web3.storage.')
  .action(async (path, opts) => {
    const paths = [path, ...opts._]
    const invocations = []
    for (const path of paths) {
      const archive = await fs.promises.readFile(path)
      const delegation = await Delegation.extract(archive)
      if (!delegation.ok) throw new Error('failed to extract archive', { cause: delegation.error })
      invocations.push(delegation.ok)
    }

    // @ts-expect-error
    const results = await connection.execute(invocations[0], ...invocations.slice(1))
    // @ts-expect-error
    for (const result of results) {
      console.log(result.out)
    }
  })
  .command('read <content>')
  .describe('Read claims from claims.web3.storage.')
  .option('-w, --walk', 'Walk these properties encountered in claims.')
  .option('--verbose', 'Write claim information to stderr.')
  .option('-o, --output', 'Write output to this file.')
  .action(async (contentArg, opts) => {
    const content = Link.parse(contentArg)
    const walk = Array.isArray(opts.walk) ? opts.walk : opts.walk?.split(',')
    const res = await Client.fetch(content.multihash, { walk, serviceURL })
    if (!res.ok) throw new Error(`unexpected service status: ${res.status}`, { cause: await res.text() })
    if (!res.body) throw new Error('missing response body')

    const writable = Writable.toWeb(opts.output ? fs.createWriteStream(opts.output) : process.stdout)
    if (opts.verbose) {
      const [body0, body1] = res.body.tee()
      await Promise.all([
        body0.pipeTo(writable),
        body1
          .pipeThrough(new CARReaderStream())
          .pipeTo(new WritableStream({
            async write (block) {
              const claim = await Client.decode(block.bytes)
              const raw = await Delegation.extract(block.bytes)
              if (raw.error) throw new Error(`failed to decode claim for: ${claim.content}`, { cause: raw.error })
              console.warn(inspect(JSON.parse(JSON.stringify(raw.ok)), false, Infinity, process.stdout.isTTY))
            }
          }))
      ])
    } else {
      await res.body.pipeTo(writable)
    }
  })

/**
 * @param {import('@ucanto/principal/ed25519').IssuedInvocationView} invocation
 * @param {string} [outputPath]
 */
const archiveClaim = async (invocation, outputPath) => {
  const ipldView = await invocation.buildIPLDView()
  const archive = await ipldView.archive()
  if (!archive.ok) throw new Error('failed to archive invocation', { cause: archive.error })
  if (outputPath) {
    await fs.promises.writeFile(outputPath, archive.ok)
    console.warn(ipldView.cid.toString())
  } else {
    process.stdout.write(archive.ok)
  }
}

const getSigner = () => {
  const pk = process.env.PRIVATE_KEY
  if (!pk) throw new Error('missing PRIVATE_KEY environment variable')
  return ed25519.parse(pk).withDID(servicePrincipal.did())
}

/**
 * take a human duration like 1d (one day)
 * return "the number of integer seconds since the Unix epoch."
 * > https://github.com/ucan-wg/spec#323-time-bounds
 * @param {string} str
 */
function toUcanExpiration (str, now = UCAN.now()) {
  if (!str) return undefined
  const input = str.toLocaleLowerCase()
  if (input === 'never') {
    return Infinity
  }
  const durationInSeconds = duration(str, 's')
  if (durationInSeconds === undefined) {
    return undefined
  }
  return now + durationInSeconds
}

prog.parse(process.argv)
