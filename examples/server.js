const express = require('express')
const mojol = require('../')
const graphqlHTTP = require('express-graphql')

// Describe the schema of your model's document
const user = mojol.model('User')

user.attrs(({ string }) => ({

  // Add validation to fields with Joi
  email: string().email(),

  // Conditionally validate based on the CRUDL operations
  name: string().on('create').required()
}))

const tweet = mojol.model('Tweet')

tweet.attrs(({ string, id, date }) => ({
  body: string().max(150)
    .on('create update').required(),
  userId: string()
    .on('create update').forbidden()
    .on('delete').required(),
  user: user.attrs()
    .on('create update delete').forbidden(),
  createdAt: date().forbidden()
    .on('create').default(new Date())
}))

// Add some business logic through Koa-like middleware
const onlyOwner = async (ctx, next) => {
  if (ctx.req.user._id !== ctx.args.userId) throw new Error('Unauthorized')
  else next()
}

const setOwner = async (ctx, next) => {
  ctx.args.userId = ctx.req.user._id
  await next()
}

const congratulate = async (ctx, next) => {
  console.log(`Creating tweet ${JSON.stringify(ctx.args)}...`)
  await next()
  console.log(`Congrats on your first tweet ${JSON.stringify(ctx.res)}!`)
}

const deleteTweets = async (ctx, next) => {
  await next()
  await ctx.db.tweets.remove({ userId: ctx.req.user._id })
}

tweet.on('delete update', onlyOwner)
tweet.on('create', setOwner, congratulate)
user.on('delete', deleteTweets)

// Create an api object and mount models
const api = mojol()
api.use(tweet, user)

// Connect to Mongo and hook in Express GraphQL
mojol.connect('mongodb://localhost:27017/test')

const app = express()

app.use((req, res, next) => {
  req.user = { name: 'Craig', _id: '1' }
  next()
})
app.use('/', graphqlHTTP({
  schema: api.schema(),
  graphiql: true,
  formatError: (err) => {
    console.log(err)
    return err
  }
}))

app.listen(3000, () => console.log('listening on 3000'))
