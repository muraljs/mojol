const express = require('express')
const graphqlHTTP = require('express-graphql')
const { model, string, id, connect, graphqlize } = require('../')

// Model
const user = model('User')

user.attrs({
  _id: id()
    .on('create').forbidden()
    .on('update delete').required(),
  email: string().email()
    .on('create').required(),
  name: string()
    .on('create').required()
})

const congratulate = async (ctx, next) => {
  console.log(`Creating user ${ctx.args.name}...`)
  await next()
  console.log(`Congrats on joining ${ctx.res.name}!`)
}

user.on('create', congratulate)

// Create GraphQL API
const schema = graphqlize(user)

// Connect to database
connect('mongodb://localhost:27017/test')

// Boot web server
const app = express()
app.use('/', graphqlHTTP({
  schema: schema,
  graphiql: true,
  formatError: (err) => {
    console.log(err)
    return err
  }
}))
app.listen(3000, () => console.log('listening on 3000'))
