# mojol

Data modeling library integrating **Mo**ngoDB, **Jo**i, and GraphQ**L**.

## Example

````javascript
const mojol = require('mojol')

const user = mojol.model('User')

user.attrs(({ string, id }) => ({
  email: string().email()
    .on('create').required(),
  name: string()
    .on('create').required()
}))

const congratulate = async (ctx, next) => {
  console.log(`Creating user ${ctx.args.name}...`)
  await next()
  console.log(`Congrats on joining ${ctx.res.name}!`)
}

user.on('create', congratulate)
````

## API

TBD

## TODO

* `model.use` plugin API
* `api.use({ schema: string(), resolve: () => })` plugin API

## Contributing

Please fork the project and submit a pull request with tests. Install node modules `npm install` and run tests with `npm test`.

## License

MIT
