ges-client
=======

**A nodejs client library for [(Get) Event Store](http://geteventstore.com)**


[![Build Status](https://secure.travis-ci.org/bmavity/ges-client.svg)](http://travis-ci.org/bmavity/ges-client)

[![NPM](https://nodei.co/npm/ges-client.png?stars&downloads&downloadRank)](https://nodei.co/npm/ges-client/) [![NPM](https://nodei.co/npm-dl/ges-client.png?months=6&height=3)](https://nodei.co/npm/ges-client/)

**Want to help out? Check out a waiting issue**
[![Stories in Ready](https://badge.waffle.io/bmavity/ges-client.png?label=ready&title=Ready)](https://waffle.io/bmavity/ges-client)

  * <a href="#intro">Introduction</a>
  * <a href="#basic">Basic usage</a>
  * <a href="#status">Major Feature Status</a>
  * <a href="#licence">Licence &amp; copyright</a>
  * <a href="#thanks">Special Thanks</a>

<a name="intro"></a>
Introduction
------------

This client assumes that you already have an [Event Store](http://geteventstore.com) instance running.

<a name="basic"></a>
Basic usage
-----------

Install

```sh
$ npm install ges-client
```

Append and read from an event stream

```js
var ges = require('ges-client')

// 1) Create a connection to a running EventStore
//    using default connection options and credentials
var connection = ges()
	, stream = 'intro-events'

// 2) Append events that can be read
connection.on('connect', function() {
	var appendData = {
	      expectedVersion: ges.expectedVersion.emptyStream
	    , events: [array of events]
			}
	connection.appendToStream(stream, appendData, function(err, appendResult) {
	  if(err) return console.log('Ooops!', err) // connection error
  	
	  // 3) Read first events from the stream
  	connection.readStreamEventsForward(stream, { start: 0, count: 1 }, function(err, readResult) {
	    if(err) return console.log('Ooops!', err) // connection error or stream does not exist

	    // ta da!
  		console.log(readResult.Events)
  	})
  })
})
```

Subscribe to stream updates

```js
var ges = require('ges-client')

// 1) Create a connection to a running EventStore
//    using default connection options and credentials
var connection = ges()
	, stream = 'intro-events'

// 2) Create a subscription
connection.on('connect', function() {
  var subscription = connection.subscribeToStream(stream)

	// 3) Listen for events
  subscription.on('event', function(evt) {
  	// ta da!
  	console.log(evt)
  })

	var appendData = {
	      expectedVersion: ges.expectedVersion.emptyStream
	    , events: [array of events]
			}
	connection.appendToStream(stream, appendData, function(err, appendResult) {
	  if(err) return console.log('Ooops!', err) // connection error
  })
})
```

<a name="status"></a>
Major Feature Status
-------------------

* Connection (Partial - not all events are available)
* Append to stream (Partial - except for transactions)
* Read from stream (Complete)
* Subscriptions (Partial - live subscription to stream only)
* Read from all (Partial - except for linktos)
* Stream ACLs (Not Started)
* Transations (Not Started)
* Stream deletes (Complete)
* Stream metadata (Complete)

<a name="license"></a>
License &amp; copyright
-------------------

Copyright (c) 2014 Brian Mavity.

ges-client is licensed under the MIT license. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE.md file for more details.


<a name="thanks"></a>
Special Thanks
-----------

Special thanks to Ken Pratt for writing the first version of this over at https://github.com/kenpratt/nodejs-EventStore .
It made early development go by much faster.


