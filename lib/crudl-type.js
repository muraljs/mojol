//
// Wraps a Joi type in a magical Proxy API so that we can extend Joi to do
// CRUD validations, e.g.
//
// ```
// {
//   _id: id()
//     .on('update').required()
//     .on('create').forbidden()
// }
// ````
//
const joi = require('joi')
const mongo = require('promised-mongo')
const { each } = require('lodash')

const idType = joi.extend({
  base: joi.string(),
  name: 'string',
  pre: (val, state, options) => {
    if (options.convert) return mongo.ObjectId(val)
    else return val
  }
}).string

module.exports = (type) => {
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
