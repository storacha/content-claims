import { fail, ok } from '@ucanto/validator'
import * as Bytes from 'multiformats/bytes'
import { base58btc } from 'multiformats/bases/base58'

/** @import * as API from '@ucanto/interface' */

/**
 * Checks that `with` on claimed capability is the same as `with`
 * in delegated capability, or starts with the same string if the delegated
 * capability is a wildcard. Note this will ignore `can` field.
 *
 * @param {API.ParsedCapability} claimed
 * @param {API.ParsedCapability} delegated
 */
export const equalWith = (claimed, delegated) => {
  if (delegated.with.endsWith('*')) {
    if (!claimed.with.startsWith(delegated.with.slice(0, -1))) {
      return fail(`Resource ${claimed.with} does not match delegated ${delegated.with}`)
    }
  }
  if (claimed.with !== delegated.with) {
    return fail(`Can not derive ${claimed.can} with ${claimed.with} from ${delegated.with}`)
  }
  return ok({})
}

/**
 * @param {unknown} claimed
 * @param {unknown} delegated
 * @param {string} constraint
 */
export const equal = (claimed, delegated, constraint) => {
  if (String(claimed) !== String(delegated)) {
    return fail(`${constraint}: ${claimed} violates ${delegated}`)
  }
  return ok({})
}

/** @param {import('multiformats').Link<unknown, number, number, 0|1>|{digest: Uint8Array}} linkOrDigest */
const toDigestBytes = (linkOrDigest) =>
  'multihash' in linkOrDigest
    ? linkOrDigest.multihash.bytes
    : linkOrDigest.digest

/**
 * @template {API.ParsedCapability<API.Ability, API.URI, { content?: API.UnknownLink | { digest: Uint8Array } }>} T
 * @param {T} claimed
 * @param {T} delegated
 * @returns {API.Result<{}, API.Failure>}
 */
export const equalLinkOrDigestContent = (claimed, delegated) => {
  if (delegated.nb.content) {
    const delegatedBytes = toDigestBytes(delegated.nb.content)
    if (!claimed.nb.content) {
      return fail(`content: undefined violates ${base58btc.encode(delegatedBytes)}`)
    }
    const claimedBytes = toDigestBytes(claimed.nb.content)
    if (!Bytes.equals(claimedBytes, delegatedBytes)) {
      return fail(`content: ${base58btc.encode(claimedBytes)} violates ${base58btc.encode(delegatedBytes)}`)
    }
  }
  return ok({})
}

/**
 * @template T
 * @param {API.Result<T , API.Failure>} result
 * @returns {{error: API.Failure, ok?:undefined}|undefined}
 */
export const and = (result) => (result.error ? result : undefined)
