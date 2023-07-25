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
import { DID } from '@ucanto/core'
import * as Delegation from '@ucanto/core/delegation'
import { CAR, HTTP } from '@ucanto/transport'
import * as Client from '@web3-storage/content-claims/client'
import { Assert } from '@web3-storage/content-claims/capability'
import { CARReaderStream } from 'carstream'

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
  .example('bagbaierae3n6cey3feykv3h5imue3eustl656dajifuddj3zedhpdofje3za https://s3.url/bagbaierae3n6cey3feykv3h5imue3eustl656dajifuddj3zedhpdofje3za.car -o location.claim')
  .action(async (contentArg, urlArg, opts) => {
    const content = Link.parse(contentArg)
    const urls = [urlArg, ...opts._]
    const signer = getSigner()

    const invocation = Assert.location.invoke({
      issuer: signer,
      audience: servicePrincipal,
      with: signer.did(),
      nb: { content, location: urls }
    })
    await archiveClaim(invocation, opts.output)
  })
  .command('partition <content> <part>')
  .describe('Generate a partition claim that asserts the content (DAG root CID) exists in the parts (CAR CIDs).')
  .option('-o, --output', 'Write output to this file.')
  .example('bafybeiefif6pfs25c6g5r4lcvsk7l6f3vnnsuziitrlca3g6rhjkhmysna bagbaierae3n6cey3feykv3h5imue3eustl656dajifuddj3zedhpdofje3za -o partition.claim')
  .action(async (contentArg, partArg, opts) => {
    const content = Link.parse(contentArg)
    const parts = [partArg, ...opts._].map(p => Link.parse(p).toV1())
    const signer = getSigner()

    const invocation = Assert.partition.invoke({
      issuer: signer,
      audience: servicePrincipal,
      with: signer.did(),
      nb: { content, parts }
    })
    await archiveClaim(invocation, opts.output)
  })
  .command('inclusion <content> <includes>')
  .describe('Generate an inclusion claim that asserts the content (CAR CID) includes the blocks in the index (CARv2 index CID).')
  .option('-o, --output', 'Write output to this file.')
  .example('bagbaierae3n6cey3feykv3h5imue3eustl656dajifuddj3zedhpdofje3za bafkreihyikwmd6vlp5g6snhqipvigffx3w52l322dtqlrf4phanxisa34m -o inclusion.claim')
  .action(async (contentArg, includesArg, opts) => {
    const content = Link.parse(contentArg)
    const includes = Link.parse(includesArg).toV1()
    const signer = getSigner()

    const invocation = Assert.inclusion.invoke({
      issuer: signer,
      audience: servicePrincipal,
      with: signer.did(),
      nb: { content, includes }
    })
    await archiveClaim(invocation, opts.output)
  })
  .command('descendant <content> <ancestor>')
  .describe('Generate a descendant claim that asserts the content is linked to directly or indirectly by the ancestor.')
  .option('-o, --output', 'Write output to this file.')
  .example('bafkreidfrmbg7ps5ezghd6aeocexwni7y7yzzj76m5xixnfcf66s3k6a44 bafybeibrqc2se2p3k4kfdwg7deigdggamlumemkiggrnqw3edrjosqhvnm -o descendant.claim')
  .action(async (contentArg, ancestorArg, opts) => {
    const content = Link.parse(contentArg)
    const ancestor = Link.parse(ancestorArg).toV1()
    const signer = getSigner()

    const invocation = Assert.descendant.invoke({
      issuer: signer,
      audience: servicePrincipal,
      with: signer.did(),
      nb: { content, ancestor }
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
    const res = await Client.fetch(content, { walk: opts.walk, serviceURL })
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

prog.parse(process.argv)
