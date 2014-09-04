ges-client
=======

**A client library for [(Get) Event Store](http://geteventstore.com)**


[![Build Status](https://secure.travis-ci.org/bmavity/ges-client.svg)](http://travis-ci.org/bmavity/ges-client)

[![NPM](https://nodei.co/npm/ges-client.png?stars&downloads&downloadRank)](https://nodei.co/npm/ges-client/) [![NPM](https://nodei.co/npm-dl/ges-client.png?months=6&height=3)](https://nodei.co/npm/ges-client/)


  * <a href="#intro">Introduction</a>
  * <a href="#basic">Basic usage</a>
  * <a href="#licence">Licence &amp; copyright</a>

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

Read from an event stream

```js
var ges = require('ges-client')

// 1) Create a connection to a running EventStore
//    using default connection options and credentials
var es = ges()

// 2) 
var thingsThatHappened = [array of events]
es.appendToStream('intro-events', thingsThatHappened, function (err) {
  if (err) return console.log('Ooops!', err) // connection error

  // 3) Read all events from the stream
  es.readStreamForward('intro-events', function (err, events) {
    if (err) return console.log('Ooops!', err) // connection error or stream does not exist

    // ta da!
    console.log(events)
  })
})
```

<a name="license"></a>
License &amp; copyright
-------------------

Copyright (c) 2014 Brian Mavity.

ges-client is licensed under the MIT license. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE.md file for more details.



