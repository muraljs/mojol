//
// Factory function that given a Mongo collection returns the `on` method for
// a model and a `resolver` function that generate the GraphQL schema resolver
// for a given CRUDL schema.
//
const compose = require('koa-compose')

module.exports = (collection) => {
  // Initial set of CRUDL middleware that persists to Mongo at the bottom of
  // the middleware stack.
  const middlewares = {
    create: [async (ctx, next) => {
      ctx.res = await collection().save(ctx.args)
      next()
    }],
    read: [async (ctx, next) => {
      ctx.res = await collection().findOne(ctx.args)
      next()
    }],
    update: [async (ctx, next) => {
      ctx.res = await collection().save(ctx.args)
      next()
    }],
    delete: [async (ctx, next) => {
      ctx.res = await collection().remove(ctx.args)
      next()
    }],
    list: [async (ctx, next) => {
      ctx.res = await collection().find(ctx.args)
      next()
    }]
  }

  // Generate a GraphQL resolve function by composing the model's middleware.
  const resolver = (method) => (root, args, req, ast) => {
    const ctx = {
      root,
      args,
      req,
      ast,
      res: method === 'list' ? [] : {},
      db: module.exports.db
    }
    return compose(middlewares[method])(ctx).then(() => ctx.res)
  }

  // Adds a middleware on top of the given CRUDL methods' stack
  const on = (methods, ...middleware) => {
    methods.split(' ').forEach((method) =>
      middlewares[method].unshift(...middleware)
    )
  }

  return { resolver, on }
}
