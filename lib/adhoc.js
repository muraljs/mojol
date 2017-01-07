//
// Helpers that construct objects for ad-hoc queries and mutations that can
// be mounted along-side models in `mojo.graphqlize`
//
const { isArray, mapValues } = require('lodash')
const compose = require('koa-compose')
const db = require('./db')

const modelize = (type) => (name, options) => {
  const middleware = isArray(options.resolve)
    ? options.resolve
    : [options.resolve]
  const fieldsSchema = options.fields.schema('all')
  const resolve = (root, args, req, ast) => {
    const ctx = {
      root,
      args,
      req,
      ast,
      db: db.db,
      res: fieldsSchema.describe().type === 'array' ? [] : {}
    }
    return compose(middleware)(ctx).then(() => ctx.res)
  }
  const meta = { resolve }
  if (options.args) {
    meta.args = mapValues(options.args, (val) => val.schema('all'))
  }
  const schema = options.fields.schema('all').meta(meta)
  return { name, type, schema }
}

module.exports.query = modelize('query')
module.exports.mutation = modelize('mutation')
