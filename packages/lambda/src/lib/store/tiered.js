/** @typedef {import('@web3-storage/content-claims/server/api').ClaimFetcher} ClaimFetcher */

/** @implements {ClaimFetcher} */
export class TieredClaimFetcher {
  #tiers

  /** @param {ClaimFetcher[]} tiers */
  constructor (tiers) {
    if (!tiers?.length) throw new Error('required at least 1 store in tiers')
    this.#tiers = tiers
  }

  /** @param {import('@ucanto/server').UnknownLink} content */
  async get (content) {
    for (const store of this.#tiers) {
      const claims = await store.get(content)
      if (claims.length) return claims
    }
    return []
  }
}
