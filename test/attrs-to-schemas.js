/* eslint-env mocha */
const attrsToSchemas = require('../lib/attrs-to-schemas')
const crudlType = require('../lib/crudl-type')
const string = crudlType('string')

describe('attrsToSchemas', () => {
  it('converts an object of wrapped types into Joi CRUDL schemas', () => {
    const attrs = {
      foo: string()
        .on('create').description('a')
        .on('read').description('b')
        .on('update').description('c')
        .on('delete').description('d')
        .on('list').description('e')
    }
    const schemas = attrsToSchemas(attrs, () => {})
    const desc = (method, attr) =>
      schemas[method]._meta[0].args[attr]._description
    desc('create', 'foo').should.equal('a')
    desc('read', 'foo').should.equal('b')
    desc('update', 'foo').should.equal('c')
    desc('delete', 'foo').should.equal('d')
    desc('list', 'foo').should.equal('e')
  })

  it('adds an _id field if not specified', () => {
    const attrs = { foo: string() }
    const schemas = attrsToSchemas(attrs, () => {})
    schemas.create._inner.children[1].key.should.equal('_id')
  })
})
