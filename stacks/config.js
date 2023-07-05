import { createRequire } from 'module'
import git from 'git-rev-sync'

/**
 * Return the custom domain config for http api
 *
 * @param {string} stage
 * @param {string | undefined} hostedZone
 * @returns {{domainName: string, hostedZone: string} | undefined}
 */
export function getCustomDomain (stage, hostedZone) {
  // return no custom domain config if hostedZone not set
  if (!hostedZone) {
    return
  }
  /** @type Record<string,string> */
  const domainMap = { prod: hostedZone }
  const domainName = domainMap[stage] ?? `${stage}.${hostedZone}`
  return { domainName, hostedZone }
}

/**
 * Import the package.json
 */
export function getApiPackageJson () {
  const require = createRequire(import.meta.url)
  // @ts-ignore ts dont see *.json and dont like it
  const pkg = require('./package.json')
  return pkg
}

/**
 * Get current git commit and branch from local repo
 */
export function getGitInfo () {
  return {
    commit: git.long('.'),
    branch: git.branch('.')
  }
}
