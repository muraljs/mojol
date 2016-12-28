# mojol

Data modeling library integrating **Mo**ngoDB, **Jo**i, and GraphQ**L**.

## Example

````javascript
const express = require('express')
const mojol = require('mojol')
const { string, date } = mojol

// Describe the schema of your model's document
const user = mojol.model('user', {

  // Add validation to fields with Joi
  email: string().email(),

  // Conditionally validate based on the CRUDL operations
  name: string().on('create').required(),
})

const tweet = mojol.model('tweet', {
  body: string().max(150)
    .on('create update').required(),
  userId: objectid()
    .on('create update').forbidden(),
  user: user.schema
    .on('create update delete').forbidden(),
  createdAt: date().forbidden()
    .on('create').default(new Date())
})


// Add some business logic through Koa-like middleware
const onlyOwner = async (ctx, next) => {
  if (ctx.user._id !== ctx.args._id) throw new Error('Unauthorized')
  else next()
}

const setOwner = async (ctx, next) => {
  ctx.args.userId = ctx.user._id
  next()
}

const congratulate = async (ctx, next) => {
  console.log(`Creating tweet ${ctx.args}...`)
  await next()
  console.log(`Congrats on your first tweet ${ctx.res.body}!`)
}

const joinUser = async (ctx, next) => {
  if (!ctx.fields.user) return next()
  await next()
  ctx.res.user = await ctx.db.users.findOne({ _id: ctx.res.userId })
}

const joinUsers = async (ctx, next) => {
  if (!ctx.fields.user) return next()
  await next()
  const userIds = ctx.res.map((t) => t.userId)
  const users = await ctx.db.users.findOne({ _id: { $in: userIds } })
  ctx.res.forEach((t, i) => t.user = users[i])
}

const deleteTweets = async (ctx, next) => {
  await next()
  await ctx.db.tweets.remove({ userId: ctx.args._id })
  console.log(`Deleted tweets for ${ctx.res.name}`)
}

tweet.on('read', joinUser)
tweet.on('list', joinUsers)
tweet.on('delete update', onlyOwner)
tweet.on('create', setOwner, congratulate)
user.on('delete', deleteTweets)

// Create an api object and mount top-level middleware along with models
const api = mojol()

const logger = async (ctx, next) => {
  const start = new Date().getTime()
  await next()
  console.log(`Full request took ${start - new Date().getTime()}`)
}

const auth = async (ctx, next) => {
  const token = ctx.http.get('Authorization: Token')
  const { error } = jwt.verify(token, SECRET)
  if (err) throw err
  else ctx.user = jwt.parse(token)
  next()
}

api.use(logger, auth, tweet, user)


// Connect to Mongo and your GraphQL adapter
mojol.connect('mongodb://localhost:27017/test')

const app = express()

app.use('/', graphqlHTTP({
  schema: api.schema,
  graphiql: true
}))

app.listen(3000, () => console.log('listening on 3000'))
````

## API


### connect(uri)

Connects to a MongoDB database and returns a [promised-mongojs](https://github.com/gordonmleigh/promised-mongo) instance.

````javascript
const { connect } = require('joiq-mongo')
const db = connect('mongodb://localhost:27017/mydb')
````

### model(name, schema)

Create an instance of a model that can be automatically converted into GraphQL schemas for [CRUDL](https://www.wikiwand.com/en/Create,_read,_update_and_delete) operations. Pass in the model name and an object of [Joi](https://github.com/hapijs/joi) types.

````javascript
const { model, string, array, objectid } = require('joiq-mongo')
const user = model('user', {
  name: string(),
  email: string().email(),
  friends: array().items(objectid())
})
````

As you can see above, JoiQL Mongo exports Joi types for your convenience. There is even a custom `objectid` type that validates and typecasts strings to [ObjectId](https://github.com/mongodb/js-bson#objectid) instances.

### model.on(method, middlewareFunction)

Hook into CRUDL operations of a model through [JoiQL middleware](https://github.com/craigspaeth/joiql). JoiQL Mongo will automatically add persistence middleware (e.g. `db.save` or `db.find` operations) to the bottom of the stack. This way you can hook into before and after persistence operations by running code before or after control flows upstream using `await next()`.

_For those faimiliar with Rails, you can think of these as the equivalent of [ActiveRecord callbacks](http://api.rubyonrails.org/classes/ActiveRecord/Callbacks.html)._

````javascript
user.on('update', async (ctx, next) => {
  await next()
  if (ctx.res.updateUser.password) sendConfirmationEmail()
})
````

### JoiType.meta(dslFunction)

JoiQL Mongo allows for conditional validation via a [DSL](https://www.wikiwand.com/en/Domain-specific_language) leveraging the [meta](https://github.com/hapijs/joi/blob/v9.0.4/API.md#anymetameta) API in Joi. Pass a function that returns an object describing the conditional validation.

See below how we use the key `'create update'` to specify that a user's name is required with a minimum of 2 characters when running a `createUser` or `updateUser` GraphQL operation. The keys of this object can be any combination of `create` `read` `update` `delete` `list` joined by spaces, and the values extend the attribute passed in as the first argument to the function.

````javascript
model('user', {
  name: string().meta((is) => ({
    'create update': is.required().min(2)
  }))
})
````

### model.create(attrs) => Promise

Convenience method for running a "create" operation that leverages validation and middleware.

````javascript
user.create({ name: 'Foo' })
  .catch(() => console.log('validation failed'))
  .then(() => console.log('successfully created user'))
````

### model.find(attrs) => Promise

Convenience method for running a "read" operation that leverages validation and middleware.

````javascript
user.find({ name: 'Foo' })
  .catch(() => console.log('validation failed'))
  .then(() => console.log('successfully created user'))
````

### model.update(attrs) => Promise

Convenience method for running an "update" operation that leverages validation and middleware.

````javascript
user.update({ _id: "543d3fb87261692e99a80500", name: 'Foo' })
  .catch(() => console.log('validation failed'))
  .then(() => console.log('successfully created user'))
````

### model.destroy(attrs) => Promise

Convenience method for running a "delete" operation that leverages validation and middleware.

````javascript
user.destroy({ _id: "543d3fb87261692e99a80500", name: 'Foo' })
  .catch(() => console.log('validation failed'))
  .then(() => console.log('successfully created user'))
````

### model.where(attrs) => Promise

Convenience method for running a "list" operation that leverages validation and middleware.

````javascript
user.where({ name: 'Foo' })
  .catch(() => console.log('validation failed'))
  .then(() => console.log('successfully created user'))
````

### query(name, schema, middleware)

Convenience utility for adding add-hoc GraphQL queries.

````javascript
const { query, string, array } = require('mojol')
query('tags', array().items(string()), async (ctx, next) => {
  ctx.res.tags = await Tags.find()
})
````

### mutation(name, schema, middleware)

Convenience utility for adding add-hoc GraphQL mutations.

````javascript
const { mutation, string, array } = require('mojol')
mutation('emailBlast', string().meta({ args: {
  emails: array().items(string().email())
} }), async (ctx, next) => {
  await sendEmail()
  ctx.res.emailBlast = 'success'
  next()
})
````

### models(...models)

Combine a set of models into a [JoiQL](https://github.com/craigspaeth/joiql) instance that exposes a [GraphQL.js](https://github.com/graphql/graphql-js) schema object.

````javascript
const { models } = require('mojol')
//...
const api = models(tweet, user)
app.use('/graphql', graphqlHTTP({ schema: api.schema }))
````

### graphqlize({ modelName: modelObject })

Convenience utility for converting a hash of model objects into mountable Koa middleware

````javascript
const { graphqlize } = require('mojol')
const models = require('./models')
const mount = require('koa-mount')

const app = new Koa()

app.use(mount('/graphql', graphqlize(models))))
````

## Contributing

Please fork the project and submit a pull request with tests. Install node modules `npm install` and run tests with `npm test`.

## License

MIT
