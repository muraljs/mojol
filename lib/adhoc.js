//
// Helpers that construct objects for ad-hoc queries and mutations that can
// be mounted along-side models in `mojo.graphqlize`
//
const compose = require('koa-compose')

module.exports.query = (name, attrs, ...middleware) => {
  const schema = attrs.schema('all')
  console.log(schema)
  return {
    name,
    schema,
    resolve: (root, args, req, ast) => {
      const ctx = {
        root,
        args,
        req,
        ast,
        res: {}
      }
      return compose(middleware)(ctx).then(() => ctx.res)
    }
  }
}
