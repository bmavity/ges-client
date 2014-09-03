var makeRequest = require('./makeRequest')
	, async = require('async')
	, uuid = require('node-uuid')

module.exports = startSubscription


function makeAuthorizedRequest(streamName, cb) {
	makeRequest(streamName, function(err, res, body) {
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

function createEntryRetriever(entry) {
	return function(cb) {
		var entryLink = getLinkWithRelation(entry.links, 'alternate')
		readEvent(entryLink.uri, function(err, evt) {
			if(err) return cb(err)
			processEvent(evt)
			cb()
		})
	}
}

function readStreamPage(pageUri, cb) {
	makeAuthorizedRequest(pageUri, function(err, feed) {
		if(err) return cb(err)

		var retrievalFns = feed.entries.reverse().map(createEntryRetriever)

		async.series(retrievalFns, function(err) {
			if(err) return cb(err)

			var nextPageLink = getLinkWithRelation(feed.links, 'previous')

			if(!nextPageLink) return cb()

			cb(null, nextPageLink.uri)
		})
	})
}

function readEvent(entryUri, cb) {
	makeAuthorizedRequest(entryUri, function(err, entry) {
		if(err) return cb(err)

		cb(null, entry)
	})
}

function processEvent(evt) {
	console.log(evt)
}

function processNextRemainingPage(err, nextPageUri) {
	if(err) return

	if(!nextPageUri) return 

	readStreamPage(nextPageUri, processNextRemainingPage)
}

function startSubscription(streamName) {
  getUriToLastPage(streamName, function(err, lastPageUri) {
  	if(err) return console.log(err)

    if(lastPageUri) {
    	readStreamPage(lastPageUri, processNextRemainingPage)
    }
  })
}
