//
// Converts an object of wrapped Joi types into individual JoiQL compliant
// schemas used to validate each CRUDL operation's args.
//
const joi = require('joi')
const { mapValues } = require('lodash')
const crudlType = require('./crudl-type')

module.exports = (attrs, resolver) => {
  if (!attrs._id) {
    attrs._id = crudlType('id')()
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
  return {
    create: fields.meta({
      args: args.create,
      resolve: resolver('create')
    }),
    read: fields.meta({
      args: args.read,
      resolve: resolver('read')
    }),
    update: fields.meta({
      args: args.update,
      resolve: resolver('update')
    }),
    delete: fields.meta({
      args: args.delete,
      resolve: resolver('delete')
    }),
    list: joi.array().items(fields).meta({
      args: args.list,
      resolve: resolver('list')
    })
  }
}
