const joi = require('joi')
const joiql = require('joiql')
const mongo = require('promised-mongo')
const pluralize = require('pluralize')
const compose = require('koa-compose')
const { camelCase, includes } = require('lodash')

module.exports.db = {}

joi.id = joi.extend({
  base: joi.string(),
  name: 'string',
  pre: (val, state, options) => {
    if (options.convert) return mongo.ObjectId(val)
    else return val
  }
}).string

const wrappedJoiType = (type, method) => {
  return (...typeArgs) => {
    const schema = joi[type](...typeArgs)
    const prototype = Object.getPrototypeOf(schema)
    prototype.on = function (methods) {
      const stub = new Proxy({}, { get: () => () => this })
      if (includes(methods, method)) return this
      else return stub
    }
    return schema
  }
}

module.exports = () => {
  const joiqlSchema = { query: {}, mutation: {} }
  const use = (...models) => {
    models.forEach((model) => {
      joiqlSchema.mutation[`create${model.singular}`] = model.schema().create
      joiqlSchema.query[camelCase(model.singular)] = model.schema().read
      joiqlSchema.mutation[`update${model.singular}`] = model.schema().update
      joiqlSchema.mutation[`delete${model.singular}`] = model.schema().delete
      joiqlSchema.query[camelCase(model.plural)] = model.schema().list
    })
  }
  const schema = () => {
    return joiql(joiqlSchema)
  }
  return { use, schema }
}

module.exports.connect = (url, collections) => {
  module.exports.db = mongo(url, collections)
}

module.exports.model = (singular) => {
  let attributes
  const plural = pluralize(singular)
  const col = () => module.exports.db[camelCase(plural)]
  const schema = { create: {}, read: {}, update: {}, delete: {}, list: {} }
  const middlewares = {
    create: [async (ctx, next) => {
      ctx.res = await col().save(ctx.args)
      next()
    }],
    read: [async (ctx, next) => {
      ctx.res = await col().findOne(ctx.args)
      next()
    }],
    update: [async (ctx, next) => {
      ctx.res = await col().save(ctx.args)
      next()
    }],
    delete: [async (ctx, next) => {
      console.log('deleting', ctx.args)
      ctx.res = await col().remove(ctx.args)
      next()
    }],
    list: [async (ctx, next) => {
      ctx.res = await col().find(ctx.args)
      next()
    }]
  }
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
  const attrs = (getAttrs) => {
    const getSchemaObj = (method) => {
      const attrs = getAttrs({
        id: wrappedJoiType('id', method),
        string: wrappedJoiType('string', method),
        boolean: wrappedJoiType('boolean', method),
        number: wrappedJoiType('number', method),
        object: wrappedJoiType('object', method),
        date: wrappedJoiType('date', method)
      })
      if (!attrs._id) {
        attrs._id = wrappedJoiType('id', method)()
        attrs._id.on('delete update').required()
      }
      return attrs
    }
    const args = {
      create: getSchemaObj('create'),
      read: getSchemaObj('read'),
      update: getSchemaObj('update'),
      delete: getSchemaObj('delete'),
      list: getSchemaObj('list')
    }
    const fields = joi.object(getSchemaObj())
    attributes = wrappedJoiType('object')(getSchemaObj())
    schema.create = fields.meta({
      args: args.create,
      resolve: resolver('create')
    })
    schema.read = fields.meta({
      args: args.read,
      resolve: resolver('read')
    })
    schema.update = fields.meta({
      args: args.update,
      resolve: resolver('update')
    })
    schema.delete = fields.meta({
      args: args.delete,
      resolve: resolver('delete')
    })
    schema.list = joi.array().items(fields).meta({
      args: args.list,
      resolve: resolver('list')
    })
  }
  const on = (methods, ...middleware) => {
    methods.split(' ').forEach((method) =>
      middlewares[method].unshift(...middleware)
    )
  }
  return {
    singular,
    plural,
    attrs: (...args) => args && args.length ? attrs(...args) : attributes,
    schema: () => schema,
    on
  }
}
