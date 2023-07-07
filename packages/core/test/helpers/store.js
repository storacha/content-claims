import { Map as LinkMap } from 'lnmap'

export class ClaimStorage {
  constructor () {
    /** @type {Map<import('@ucanto/server').UnknownLink, import('@web3-storage/content-claims/store').Claim>} */
    this.data = new LinkMap()
  }

  /** @param {import('@web3-storage/content-claims/store').Claim} claim */
  async put (claim) {
    this.data.set(claim.content, claim)
  }

  /** @param {import('@ucanto/server').UnknownLink} content */
  async get (content) {
    return this.data.get(content)
  }

  /** @param {import('@ucanto/server').UnknownLink} content */
  async list (content) {
    const claim = this.data.get(content)
    return claim ? [claim] : []
  }
}
