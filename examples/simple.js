const express = require('express')
const mojol = require('../')
const graphqlHTTP = require('express-graphql')

// Model
const user = mojol.model('User')
user.attrs(({ string, id }) => ({
  email: string().email()
    .on('create').required(),
  name: string()
    .on('create').required()
}))

const congratulate = async (ctx, next) => {
  console.log(`Creating user ${JSON.stringify(ctx.args)}...`)
  await next()
  console.log(`Congrats on joining ${ctx.res.name}!`)
}

user.on('create', congratulate)

// API
const api = mojol()
api.use(user)

// Connect & boot server
const app = express()
mojol.connect('mongodb://localhost:27017/test')
app.use('/', graphqlHTTP({
  schema: api.schema(),
  graphiql: true,
  formatError: (err) => {
    console.log(err)
    return err
  }
}))
app.listen(3000, () => console.log('listening on 3000'))
