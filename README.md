# mojol

Data modeling library integrating **Mo**ngoDB, **Jo**i, and GraphQ**L**.

## Example

````javascript
const { model, string, id, graphqlize } = require('mojol')

const user = model('User', {
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

const schema = graphqlize(user)
````

## API

TBD

## TODO

* `model.use` plugin API

## Contributing

Please fork the project and submit a pull request with tests. Install node modules `npm install` and run tests with `npm test`.

## License

MIT
