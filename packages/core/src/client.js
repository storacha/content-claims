import { connect, invoke, delegate } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'

export const serviceURL = new URL('https://claims.web3.storage')

/** @type {import('@ucanto/interface').Principal} */
export const servicePrincipal = { did: () => 'did:web:claims.web3.storage' }

/** @type {import('@ucanto/interface').ConnectionView<import('./service').Service>} */
export const connection = connect({
  id: servicePrincipal,
  codec: CAR.outbound,
  channel: HTTP.open({ url: serviceURL, method: 'POST' })
})

export { connect, invoke, delegate, CAR, HTTP }
