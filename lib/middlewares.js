//
// Factory function that given a Mongo collection returns the `on` method for
// a model and a `resolver` function that generate the GraphQL schema resolver
// for a given CRUDL schema.
//
const compose = require('koa-compose')
let { collection } = require('./db')

module.exports = (collectionName) => {
  // Initial set of CRUDL middleware that persists to Mongo at the bottom of
  // the middleware stack.
  const middlewares = {
    create: [(ctx, next) => {
      return collection(collectionName).save(ctx.args)
        .then((doc) => { ctx.res = doc })
        .then(() => next())
    }],
    read: [(ctx, next) => {
      return collection(collectionName).findOne(ctx.args)
        .then((doc) => { ctx.res = doc })
        .then(() => next())
    }],
    update: [(ctx, next) => {
      return collection(collectionName).save(ctx.args)
        .then((doc) => { ctx.res = doc })
        .then(() => next())
    }],
    delete: [(ctx, next) => {
      return collection(collectionName).remove(ctx.args)
        .then((doc) => { ctx.res = doc })
        .then(() => next())
    }],
    list: [(ctx, next) => {
      return collection(collectionName).find(ctx.args)
        .then((doc) => { ctx.res = doc })
        .then(() => next())
    }]
  }

  // Generate a GraphQL resolve function by composing the model's middleware.
  const resolver = (method) => (root, args, req, ast) => {
    const ctx = {
      root,
      args,
      req,
      ast,
      res: method === 'list' ? [] : {}
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
