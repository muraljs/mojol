const joi = require('joi')
const joiql = require('joiql')
const mongo = require('promised-mongo')
const pluralize = require('pluralize')
const compose = require('koa-compose')
const { camelCase, mapValues, each } = require('lodash')

module.exports.db = {}

const idType = joi.extend({
  base: joi.string(),
  name: 'string',
  pre: (val, state, options) => {
    if (options.convert) return mongo.ObjectId(val)
    else return val
  }
}).string

const wrapJoiType = (type) => {
  return (...typeArgs) => {
    const schema = () =>
      type === 'id'
        ? idType(...typeArgs)
        : joi[type](...typeArgs)
    let schemas = {
      all: schema(),
      create: schema(),
      read: schema(),
      update: schema(),
      delete: schema(),
      list: schema()
    }
    let curSchemas = ['all']
    const proxy = new Proxy({}, {
      get: (_, key) => {
        return (...args) => {
          if (key === 'on') {
            curSchemas = args[0].split(' ')
          } else if (key === 'schema') {
            return schemas[args[0]]
          } else if (key === 'describe') {
            return schemas.all.describe(...args)
          } else {
            curSchemas.forEach((k) => {
              if (k === 'all') {
                each(schemas, (v, k) => {
                  schemas[k] = schemas[k][key](...args)
                })
              } else schemas[k] = schemas[k][key](...args)
            })
          }
          return proxy
        }
      }
    })
    return proxy
  }
}

module.exports.id = wrapJoiType('id')
module.exports.string = wrapJoiType('string')
module.exports.boolean = wrapJoiType('boolean')
module.exports.number = wrapJoiType('number')
module.exports.object = wrapJoiType('object')
module.exports.date = wrapJoiType('date')

module.exports.graphqlize = (...models) => {
  const joiqlSchema = { query: {}, mutation: {} }
  models.forEach((model) => {
    joiqlSchema.mutation[`create${model.singular}`] = model.schema().create
    joiqlSchema.query[camelCase(model.singular)] = model.schema().read
    joiqlSchema.mutation[`update${model.singular}`] = model.schema().update
    joiqlSchema.mutation[`delete${model.singular}`] = model.schema().delete
    joiqlSchema.query[camelCase(model.plural)] = model.schema().list
  })
  return joiql(joiqlSchema)
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
  const attrs = (attrs) => {
    if (!attrs._id) {
      attrs._id = wrapJoiType('id')()
      attrs._id.on('delete update').required()
    }
    const schemaObj = (method = 'all') =>
      mapValues(attrs, (attr) => attr.schema(method))
    const args = {
      create: schemaObj('create'),
      read: schemaObj('read'),
      update: schemaObj('update'),
      delete: schemaObj('delete'),
      list: schemaObj('list')
    }
    const fields = joi.object(schemaObj())
    attributes = wrapJoiType('object')(schemaObj())
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
