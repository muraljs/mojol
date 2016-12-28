const { model, db } = require('mojol')
const realtions = require('mojol-relations')
const author = require('models/author')
const artist = requie('models/artist')

const article = model('Article')

article.use(relations)

article.attrs(({ string, boolean, date, array, id, one, many }) => ({
  title: string(),
  body: string(),
  author: one(author),
  relatedArticles: many(article),
  artists: many(artist),
  keywords: array(string()).forbidden(),
  published: boolean()
    .on('create').default(false),
  sections: array().items(
    object({
      title: string(),
      artistId: id()
    })
  )
}))

export const updateKeywords = async (article) => {
  const related = await Promise.all([
    db.artists.findOne({ _id: { $in: article.artists } }),
    db.artworks.findOne({ _id: { $in: article.artworks } }),
    db.partners.findOne({ _id: { $in: article.partners } }),
    db.shows.findOne({ _id: { $in: article.shows } })
  ])
  const keywords = _(related).flatten().map('name')
  db.articles.update({ _id: article._id }, { $set: { keywords } })
}

export const generateKeywords = async (ctx, next) => {
  await next()
  updateKeywords(ctx.res)
}

export const removeStopWords = async (ctx, next) => {
  ctx.args.title = _(title)
    .replace(/[.,\/#!$%\^&\*;:{}=\—_`’~()]/g," ")
    .split(' ')
    .difference(stopWords)
    .join(' ')
  next()
}

article.on('create update', removeStopWords)
article.on('create', generateKeywords)