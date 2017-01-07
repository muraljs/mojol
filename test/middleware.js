/* eslint-env mocha */
const rewire = require('rewire')
const sinon = require('sinon')
const middlewares = rewire('../lib/middlewares')

describe('middlewares', () => {
  let collection, m, root, args, req, ast

  beforeEach(() => {
    root = {}
    args = {}
    req = {}
    ast = {}
    collection = {
      findOne: sinon.stub().returns(Promise.resolve()),
      save: sinon.stub().returns(Promise.resolve()),
      remove: sinon.stub().returns(Promise.resolve()),
      find: sinon.stub().returns(Promise.resolve())
    }
    middlewares.__set__('db', { db: ({ foo: collection }) })
    m = middlewares('foo')
  })

  it('can convert middleware to graphql resolve functions', () => {
    args = { baz: 'qux' }
    collection.save.returns(Promise.resolve({ foo: 'bar' }))
    return m.resolver('create')(root, args, req, ast).then((res) => {
      collection.save.args[0][0].baz.should.equal('qux')
      res.foo.should.equal('bar')
    })
  })

  it('sets up middleware for CRUDL opperations', () => {
    args = { baz: 'qux' }
    const run = (method) => m.resolver(method)(root, args, req, ast)
    return Promise.all([
      run('create'),
      run('read'),
      run('update'),
      run('delete'),
      run('list')
    ]).then(() => {
      collection.save.called.should.be.ok()
      collection.findOne.called.should.be.ok()
      collection.remove.called.should.be.ok()
      collection.find.called.should.be.ok()
    })
  })
})
