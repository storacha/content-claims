import { Map as LinkMap } from 'lnmap'

export class ClaimStorage {
  constructor () {
    /** @type {Map<import('@ucanto/server').UnknownLink, import('../../src/server/api').Claim>} */
    this.data = new LinkMap()
  }

  /** @param {import('../../src/server/api').Claim} claim */
  async put (claim) {
    this.data.set(claim.content, claim)
  }

  /** @param {import('@ucanto/server').UnknownLink} content */
  async get (content) {
    const claim = this.data.get(content)
    return claim ? [claim] : []
  }
}
