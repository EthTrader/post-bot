const Watcher = require('rss-watcher')
const snoowrap = require('snoowrap')
const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')
const feeds = require('./feeds')

const adapter = new FileAsync('db.json')
const reddit = new snoowrap({
  userAgent: 'Post Bot 1.0 by u/EthTraderCommunity',
  clientId: process.env.REDDIT_SCRIPT_CLIENT_ID,
  clientSecret: process.env.REDDIT_SCRIPT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD
})

feeds.forEach(setup)

function setup(feed){
  const watcher = new Watcher({uri: feed.url, interval: 30})
  watcher.on('new article', getProcessor(feed))
  watcher.run((err, articles)=>{
    if(err) console.log(err)
    console.log(`setup ${feed.id}`)
  })
}

function getProcessor(feed){
  return async function processArticle(article){
    console.log(article.link)
    if(feed.filter.length && !filter(feed, article)){
      console.log(`\tfilter`)
      return
    }
    try {
      const post = await reddit.getSubreddit('ethtrader').submitLink({
        title: article.title,
        url: article.link,
        sendReplies: false,
        resubmit: false
      })
      console.log(`\tposted: ${await post.id}`)
    } catch(e){
      if(e.message.includes("ALREADY_SUB"))
        console.log("\tdupe")
      else
        console.log(e)
    }
  }
}

function filter(feed, article){
  const {paywall, filter} = feed
  if(article.title.toLowerCase().includes('ethereum classic'))
    return false
  if(article.title.toLowerCase().includes('tron'))
    return false
  if(article.title.toLowerCase().includes('ripple'))
    return false
  if(paywall && article.link.includes(paywall))
    return false
  if(!!article['content:encoded']){
    console.log(typeof article['content:encoded'])
    return filter.some(term=>article['content:encoded']['#'].includes(term))
  } else {
    return filter.some(term=>article['description'].includes(term))
  }
}
