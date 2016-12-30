/* eslint-env mocha */
const crudlType = require('../lib/crudl-type')

describe('crudlType', () => {
  it('generates a joi schema with `schema(method)`', () => {
    const type = crudlType('string')().label('hi')
    const desc = type.schema('all').describe()
    desc.label.should.equal('hi')
  })

  it('generates CRUDL specific joi schemas', () => {
    const type = crudlType('string')()
      .label('hi')
      .on('create').label('bye')
    const desc = type.schema('create').describe()
    desc.label.should.equal('bye')
  })
})
