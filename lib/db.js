//
// Wrappers around MongoJS for lazy loading
//
const mongo = require('promised-mongo')

module.exports.collection = (collectionName) => {
  return module.exports.db[collectionName]
}

module.exports.connect = (url, collections) => {
  module.exports.db = mongo(url, collections)
}
