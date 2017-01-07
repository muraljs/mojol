const pluralize = require('pluralize')
const { camelCase } = require('lodash')
const joiql = require('joiql')
const db = require('./lib/db')
const crudlType = require('./lib/crudl-type')
const middlewares = require('./lib/middlewares')
const attrsToSchemas = require('./lib/attrs-to-schemas')
const adhoc = require('./lib/adhoc')
const mount = require('koa-mount')
const convert = require('koa-convert')
const graphqlHTTP = require('koa-graphql')

// Export wrapped Joi type APIs
module.exports.id = crudlType('id')
module.exports.string = crudlType('string')
module.exports.boolean = crudlType('boolean')
module.exports.number = crudlType('number')
module.exports.array = crudlType('array')
module.exports.object = crudlType('object')
module.exports.date = crudlType('date')

// Export APIs for database connection, adhoc schemas, and converting to graphql
module.exports.connect = db.connect
module.exports.query = adhoc.query
module.exports.mutation = adhoc.mutation

// Given a list of models turn it into a GraphQL.js schema object
const graphqlize = module.exports.graphqlize = (...models) => {
  const joiqlSchema = { query: {}, mutation: {} }
  models.forEach((model) => {
    if (model.type === 'model') {
      joiqlSchema.mutation[`create${model.singular}`] = model.schemas.create
      joiqlSchema.query[camelCase(model.singular)] = model.schemas.read
      joiqlSchema.mutation[`update${model.singular}`] = model.schemas.update
      joiqlSchema.mutation[`delete${model.singular}`] = model.schemas.delete
      joiqlSchema.query[camelCase(model.plural)] = model.schemas.list
    } else if (model.type === 'query') {
      joiqlSchema.query[model.name] = model.schema
    } else if (model.type === 'mutation') {
      joiqlSchema.mutation[model.name] = model.schema
    }
  })
  return joiql(joiqlSchema)
}

// Convert a list of models directly into Koa2 middleware
module.exports.koaize = (route, ...models) => {
  const schema = graphqlize(...models)
  return mount(route, convert(graphqlHTTP({ schema, graphiql: true })))
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
    type: 'model',
    singular,
    plural,
    schemas,
    on
  }
}
