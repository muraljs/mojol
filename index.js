const joi = require('joi')
const joiql = require('joiql')
const pluralize = require('pluralize')
const { camelCase, mapValues } = require('lodash')
const { db, connect } = require('./lib/db')
const wrappedType = require('./lib/wrapped-type')
const middlewares = require('./lib/middlewares')

// Export types.
module.exports.id = wrappedType('id')
module.exports.string = wrappedType('string')
module.exports.boolean = wrappedType('boolean')
module.exports.number = wrappedType('number')
module.exports.object = wrappedType('object')
module.exports.date = wrappedType('date')

// Connect and export our Mongo database.
module.exports.db = db
module.exports.connect = connect

// Given a list of models turn it into a GraphQL.js schema object.
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

// Factory function that creates a model object.
//
// Models are a collection of Joi schemas for CRUDL operations, contained in
// `model.schema().create` for instance. Models also provide a `model.on`
// function for hooking Koa-like middleware into CRUDL operation.
//
// e.g.
// ```
// model.on('create', async (ctx, next) => {
//  if (ctx.args.published) console.log('Publishing...')
//  await next()
//  if (ctx.res.published) console.log('Successfully published')
// })
// ```
//
module.exports.model = (singular, initAttrs) => {
  let attributes
  const plural = pluralize(singular)
  const schema = { create: {}, read: {}, update: {}, delete: {}, list: {} }
  const { resolver, on } = middlewares(() => db[camelCase(plural)])

  // Converts an object of wrapped Joi types into individual Joi schemas used
  // to validate each CRUDL opeartion's args.
  const attrs = (attrs) => {
    if (!attrs) return attributes
    if (!attrs._id) {
      attrs._id = wrappedType('id')()
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
    attributes = wrappedType('object')(schemaObj())
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

  // Convenience for passing attrs as a second argument
  if (initAttrs) attrs(initAttrs)

  // Compose a model object from the Joi schemas and methods
  return {
    singular,
    plural,
    attrs,
    schema: () => schema,
    on
  }
}
