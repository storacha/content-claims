import { SSTConfig } from 'sst'
import { Tags } from 'aws-cdk-lib'
import { API } from './stacks/api.js'
import { DB } from './stacks/db.js'
import { Bucket } from './stacks/bucket.js'

export default {
  config(_input) {
    return {
      name: 'content-claims',
      region: 'us-west-2'
    }
  },
  stacks(app) {
    // tags let us discover all the aws resource costs incurred by this app
    // see: https://docs.sst.dev/advanced/tagging-resources
    Tags.of(app).add('Project', 'content-claims')
    Tags.of(app).add('Repository', 'https://github.com/storacha/content-claims')
    Tags.of(app).add('Environment', `${app.stage}`)
    Tags.of(app).add('ManagedBy', 'SST')

    app.stack(Bucket)
    app.stack(DB)
    app.stack(API)
  }
} satisfies SSTConfig
