import { Map as LinkMap } from 'lnmap'

/** @template V */
class MemoryStorage {
  constructor () {
    /** @type {Map<import('@ucanto/server').UnknownLink, V>} */
    this.data = new LinkMap()
  }
}

/** @extends {MemoryStorage<import('@web3-storage/content-claims/store').LocationClaim>} */
export class LocationClaimStorage extends MemoryStorage {
  /** @param {import('@web3-storage/content-claims/store').LocationClaim} claim */
  async put ({ content, location, range }) {
    this.data.set(content, { content, location, range })
  }

  /** @param {import('@ucanto/server').UnknownLink} content */
  async get (content) {
    return this.data.get(content)
  }

  /** @param {import('@ucanto/server').UnknownLink[]} contents */
  async getMany (contents) {
    const results = []
    for (const content of contents) {
      const claim = this.data.get(content)
      if (claim) results.push(claim)
    }
    return results
  }
}

/** @extends {MemoryStorage<import('@web3-storage/content-claims/store').InclusionClaim>} */
export class InclusionClaimStorage extends MemoryStorage {
  /** @param {import('@web3-storage/content-claims/store').InclusionClaim} claim */
  async put ({ content, includes, proof }) {
    this.data.set(content, { content, includes, proof })
  }

  /** @param {import('@ucanto/server').UnknownLink} content */
  async get (content) {
    return this.data.get(content)
  }
}

/** @extends {MemoryStorage<import('@web3-storage/content-claims/store').PartitionClaim>} */
export class PartitionClaimStorage extends MemoryStorage {
  /** @param {import('@web3-storage/content-claims/store').PartitionClaim} claim */
  async put ({ content, blocks, parts }) {
    this.data.set(content, { content, blocks, parts })
  }

  /** @param {import('@ucanto/server').UnknownLink} content */
  async get (content) {
    return this.data.get(content)
  }
}

/** @extends {MemoryStorage<import('@web3-storage/content-claims/store').RelationClaim>} */
export class RelationClaimStorage extends MemoryStorage {
  /** @param {import('@web3-storage/content-claims/store').RelationClaim} claim */
  async put ({ parent, child }) {
    this.data.set(parent, { parent, child })
  }

  /** @param {import('@ucanto/server').UnknownLink} parent */
  async get (parent) {
    return this.data.get(parent)
  }
}
