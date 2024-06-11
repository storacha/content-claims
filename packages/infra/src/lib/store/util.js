/** @typedef {import('@web3-storage/content-claims/server/api').ClaimFetcher} ClaimFetcher */

/**
 * Combines claim fetchers in order to fetch claims from multiple sources.
 *
 * @param {ClaimFetcher[]} fetchers
 * @returns {ClaimFetcher}
 */
export const combine = (fetchers) => ({
  async get (content) {
    const claims = await Promise.all(fetchers.map(async f => f.get(content)))
    return claims.flat()
  }
})
