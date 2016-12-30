const joiql = require('joiql')
const pluralize = require('pluralize')
const { camelCase } = require('lodash')
const db = require('./lib/db')
const wrappedType = require('./lib/wrapped-type')
const middlewares = require('./lib/middlewares')
const attrsToSchemas = require('./lib/attrs-to-schemas')

// Export wrapped Joi type APIs
module.exports.id = wrappedType('id')
module.exports.string = wrappedType('string')
module.exports.boolean = wrappedType('boolean')
module.exports.number = wrappedType('number')
module.exports.object = wrappedType('object')
module.exports.date = wrappedType('date')

// Connect and export our Mongo database
module.exports.db = db.db
module.exports.connect = db.connect

// Given a list of models turn it into a GraphQL.js schema object
module.exports.graphqlize = (...models) => {
  const joiqlSchema = { query: {}, mutation: {} }
  models.forEach((model) => {
    joiqlSchema.mutation[`create${model.singular}`] = model.schemas.create
    joiqlSchema.query[camelCase(model.singular)] = model.schemas.read
    joiqlSchema.mutation[`update${model.singular}`] = model.schemas.update
    joiqlSchema.mutation[`delete${model.singular}`] = model.schemas.delete
    joiqlSchema.query[camelCase(model.plural)] = model.schemas.list
  })
  return joiql(joiqlSchema)
}

// Factory function that creates a model object.
//
// Models are a collection of Joi schemas for CRUDL operations, contained in
// `model.schemas.create` for instance. Models also provide a `model.on`
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
module.exports.model = (singular, attrs) => {
  const plural = pluralize(singular)
  const { resolver, on } = middlewares(camelCase(plural))
  const schemas = attrsToSchemas(attrs, resolver)
  return {
    singular,
    plural,
    attrs,
    schemas,
    on
  }
}
