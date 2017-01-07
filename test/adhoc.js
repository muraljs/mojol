/* eslint-env mocha */
const { query } = require('../lib/adhoc')
const crudlType = require('../lib/crudl-type')
const string = crudlType('string')

describe('adhoc', () => {
  it('creates a model object for resolving an adhoc query', () => {
    const q = query('foo', {
      fields: string(),
      resolve: (ctx) => { ctx.res = 'bar' }
    })
    const resolve = q.schema.describe().meta[0].resolve()
    return resolve.then((res) => res.should.equal('bar'))
  })

  it('can stack middleware in the resolve', () => {
    const q = query('foo', {
      fields: string(),
      resolve: [
        (ctx, next) => {
          ctx.res = 'bar'
          next()
        },
        (ctx) => { ctx.res = 'baz' }
      ]
    })
    const resolve = q.schema.describe().meta[0].resolve()
    return resolve.then((res) => res.should.equal('baz'))
  })

  it('can accept args', () => {
    const q = query('foo', {
      args: { id: string() },
      fields: string(),
      resolve: (ctx) => { ctx.res = 'bar' }
    })
    q.schema.describe().meta[0].args.id.describe().type === 'string'
  })
})
