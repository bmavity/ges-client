var request = require('request')
	, uuid = require('node-uuid')
	, esUrl = 'http://127.0.0.1:2113/streams/testy'
	//, esUrl = 'http://127.0.0.1:2113/streams/$$$users'
	, longPollHeader = 'ES-LongPoll: 10'
	, formatHeader = 'application/vnd.eventstore.atom+json'
	, username = 'admin'
	, password = 'changeit'


function makeAuthorizedRequest(url, cb) {
	request({
		url: url
	, auth: {
			username: username
		, password: password
		}
	, headers: {
			'Accept': formatHeader
		}
	}, function(err, res, body) {
		if(err) return cb(err)
		cb(null, JSON.parse(body))
	})
}

function getLinkWithRelation(links, rel) {
	return links.filter(function(link) {
		return link.relation === rel
	})[0]
}

function getUriToLastPage(headUri, cb) {
	makeAuthorizedRequest(headUri, function(err, feed) {
		if(err) return cb(err)

		var lastPageLink = getLinkWithRelation(feed.links, 'last')
		if(lastPageLink) return cb(null, lastPageLink.uri)

		var selfLink = getLinkWithRelation(feed.links, 'self')
		if(selfLink) return cb(null, selfLink.uri)

		cb(null, null)
	})
}

function readStreamPage(pageUri, cb) {
	makeAuthorizedRequest(pageUri, function(err, feed) {
		if(err) return cb(err)

		feed.entries.reverse().forEach(function(entry) {
			var entryLink = getLinkWithRelation(entry.links, 'alternate')
			readEvent(entryLink.uri, processEvent)
		})
	})
}

function readEvent(entryUri, cb) {
	makeAuthorizedRequest(entryUri, function(err, entry) {
		if(err) return cb(err)

		cb(null, entry)
	})
}

function processEvent(err, evt) {
	console.log(evt)
}

function processNextRemainingPage(err) {
	console.log('move along')
}
//var timer = new Timer(o => PostMessage(), null, 1000, 1000);
function startSubscription(streamHeadUri) {
  getUriToLastPage(streamHeadUri, function(err, lastPageUri) {
  	if(err) return console.log(err)

    if(lastPageUri) {
    	console.log(lastPageUri)
    	readStreamPage(lastPageUri, processNextRemainingPage)
    }
  })
}


//addEventToStream(esUrl)
startSubscription(esUrl)

function addEventToStream(streamUrl) {
  var message = [{
  				eventType: 'MyFirstEvent'
  			, eventId : uuid.v4()
				, data : {
						name: 'hello world!'
					, number : Math.random()
					}
				, metadata: {
						addedDate: new Date()
					}
				}
			]
  	, req = request.post({
		  	url: streamUrl
		  , body: message
			, auth: {
					username: username
				, password: password
				}
			, json: true
		  }) 
  req.on('response', function() {
		startSubscription(esUrl)
  })
}


/*
while(!stop)
{
  var current = readPrevious(last)
  if(last == current)
  {
  	break;
  }
  last = current
}
*/