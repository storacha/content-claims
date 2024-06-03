export * from '@ucanto/core/result'

/**
 * Returns contained `ok` if result is and throws `error` if result is not ok.
 *
 * @template T
 * @param {import('@ucanto/interface').Result<T, {}>} result
 * @returns {T}
 */
export const unwrap = ({ ok, error }) => {
  if (error) {
    throw error
  } else {
    return /** @type {T} */ (ok)
  }
}

/**
 * Also expose as `Result.try` which is arguably more clear.
 */
export { unwrap as try }
