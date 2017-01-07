/* eslint-env mocha */
const { graphqlize, koaize } = require('../')
const crudlType = require('../lib/crudl-type')
const string = crudlType('string')
const { model } = require('../')

const user = model('User', {
  name: string()
})

describe('graphqlize', () => {
  it('converts models into a graphql schema', () => {
    const schema = graphqlize(user)
    schema._queryType._fields.user.type._fields._id.type.name
      .should.equal('String')
  })
})

describe('koaize', () => {
  it('converts models into graphql koa middleware', () => {
    const middleware = koaize('/api', user)
    middleware.toString().should.containEql('mount')
  })
})
