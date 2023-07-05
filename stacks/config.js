import { createRequire } from 'module'
import git from 'git-rev-sync'

/**
 * @param {string} stage
 * @param {string} rootDomain
 */
export function domainForStage (stage, rootDomain) {
  if (stage === 'prod') {
    return rootDomain
  }
  return `${stage}.${rootDomain}`
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
