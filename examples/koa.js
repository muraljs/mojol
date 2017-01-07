const Koa = require('koa')
const { model, string, connect, koaize } = require('../')

const user = model('User', { name: string() })

connect('mongodb://localhost:27017/test')

const app = new Koa()

app.use(koaize('/api', user))

app.listen(3000, () => console.log('listening on 3000'))
