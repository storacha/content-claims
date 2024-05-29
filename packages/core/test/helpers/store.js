import { base58btc } from 'multiformats/bases/base58'

export class ClaimStorage {
  constructor () {
    /** @type {Map<string, import('../../src/server/api').Claim>} */
    this.data = new Map()
  }

  /** @param {import('../../src/server/api').Claim} claim */
  async put (claim) {
    this.data.set(base58btc.encode(claim.content.bytes), claim)
  }

  /** @param {import('@ucanto/server').MultihashDigest} content */
  async get (content) {
    const claim = this.data.get(base58btc.encode(content.bytes))
    return claim ? [claim] : []
  }
}
