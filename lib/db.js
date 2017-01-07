//
// Wrappers around MongoJS
//
const mongo = require('promised-mongo')

module.exports.connect = (url, collections) => {
  module.exports.db = mongo(url, collections)
}
