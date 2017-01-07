const express = require('express')
const {
  model,
  connect,
  graphqlize,
  id,
  string,
  array,
  date,
  query,
  mutation
} = require('../')
const graphqlHTTP = require('express-graphql')

// Describe the schema of your model's document
const user = model('User', {

  // Add validation to fields with Joi
  email: string().email(),

  // Conditionally validate based on the CRUDL operations
  name: string().on('create').required()
})

const tweet = model('Tweet', {
  body: string().max(150)
    .on('create update').required(),
  userId: string()
    .on('create update').forbidden()
    .on('delete').required(),
  createdAt: date().forbidden()
    .on('create').default(new Date())
})

// Use ad-hoc queries and mutations
const distinctUserNames = async (ctx, next) => {
  ctx.res = await ctx.db.users.distinct('name')
  next()
}
const userNames = query('userNames', {
  fields: array().items(string()),
  resolve: distinctUserNames
})
const confirmSent = async (ctx, next) => {
  console.log('sending to', ctx.args.ids)
  await next()
  ctx.res = 'Success'
  console.log('sent')
}
const sendEmailBlast = async (ctx, next) => {
  const users = await ctx.db.users.find({ _id: { $in: ctx.args.ids } })
  console.log('sending to', users.map((u) => u.name))
  next()
}
const blastEmail = mutation('blastEmail', {
  args: {
    ids: array().items(id())
  },
  fields: string(),
  resolve: [confirmSent, sendEmailBlast]
})

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
const schema = graphqlize(tweet, user, userNames, blastEmail)

// Connect to Mongo and hook in Express GraphQL
connect('mongodb://localhost:27017/test')

const app = express()

app.use((req, res, next) => {
  req.user = { name: 'Craig', _id: '1' }
  next()
})
app.use('/', graphqlHTTP({
  schema: schema,
  graphiql: true,
  formatError: (err) => {
    console.log(err)
    return err
  }
}))

app.listen(3000, () => console.log('listening on 3000'))
