var client = require('../../../')
	, async = require('async')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')

describe('subscribe_to_stream_catching_up_should', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5010 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5010 }, done)
		})
	})

	it('be_able_to_subscribe_to_non_existing_stream', function(done) {
    var stream = 'be_able_to_subscribe_to_non_existing_stream'
    	, subscription = connection.subscribeToStreamFrom(stream)
    	, hasError = false

    function indicateError() {
    	hasError = true
    }

    connection.subscribeToStream(stream)
    	.on('error', indicateError)

    subscription.on('dropped', function() {
    	hasError.should.be.false
    	done()
    }).on('error', indicateError)

    subscription.on('live', function() {
	    subscription.stop()
    })
  })

  it('be_able_to_subscribe_to_non_existing_stream_and_then_catch_event', function(done) {
    var stream = 'be_able_to_subscribe_to_non_existing_stream_and_then_catch_event'
    	, subscription = connection.subscribeToStreamFrom(stream)
 	    , appendData = {
					expectedVersion: client.expectedVersion.emptyStream
				, events: createTestEvent()
		    } 
		  , eventCount = 0
		  , status = {}

		function checkStatus() {
			if(status.live && status.appended) {
	    	subscription.stop()
			}
		}

    subscription.on('event', function(evt) {
    	eventCount += 1
    }).on('live', function() {
    	status.live = true
    	checkStatus()
    }).on('dropped', function() {
    	eventCount.should.equal(1)
    	done()
    }).on('error', done)

    connection.appendToStream(stream, appendData, function(err) {
    	if(err) return done(err)
    	status.appended = true
    	checkStatus()
    })
  })

  it('allow_multiple_subscriptions_to_same_stream', function(done) {
    var stream = 'allow_multiple_subscriptions_to_same_stream'
    	, sub1 = connection.subscribeToStreamFrom(stream)
    	, sub2 = connection.subscribeToStreamFrom(stream)
 	    , appendData = {
					expectedVersion: client.expectedVersion.emptyStream
				, events: createTestEvent()
		    } 
    	, evt1Count = 0
    	, evt2Count = 0
    	, status = {}
    	, dropped = {}

    function checkStatus() {
			if(status.sub1 && status.sub2 && status.appended) {
	    	sub1.stop()
	    	sub2.stop()
			}
		}

    function testForFinish() {
    	if(dropped.sub1 && dropped.sub2) {
    		evt1Count.should.equal(1)
    		evt2Count.should.equal(1)
	    	done()
    	}
    }

    sub1.on('event', function(evt) {
    	evt1Count += 1
    }).on('dropped', function() {
    	dropped.sub1 = true
    	testForFinish()
    }).on('live', function() {
    	status.sub1 = true
    	checkStatus()
    }).on('error', done)

    sub2.on('event', function(evt) {
    	evt2Count += 1
    }).on('dropped', function() {
    	dropped.sub2 = true
    	testForFinish()
    }).on('live', function() {
    	status.sub2 = true
    	checkStatus()
    }).on('error', done)

    connection.appendToStream(stream, appendData, function(err) {
    	if(err) return done(err)
    	status.appended = true
    	setTimeout(checkStatus, 2000)
    })
  })

  it('call_dropped_callback_after_stop_method_call', function(done) {
    var stream = 'call_dropped_callback_after_stop_method_call'
    	, subscription = connection.subscribeToStreamFrom(stream)

    subscription.on('dropped', function(evt) {
    	should.pass()
    	done()
    })

    subscription.stop()
  })

  it('read_all_existing_events_and_keep_listening_to_new_ones', function(done) {
    var stream = 'read_all_existing_events_and_keep_listening_to_new_ones'
    	, subscribedEvents = []

    function appendEvent(eventNumber) {
    	return function(cb) {
	    	var appendData = {
			    		expectedVersion: eventNumber - 1
			    	, events: client.createEventData(uuid.v4(), 'et-' + eventNumber, false, new Buffer(3))
			    	}
			  connection.appendToStream(stream, appendData, cb)
    	}
    }

    async.series(range(0, 10).map(appendEvent) , function(err) {
    	if(err) return done(err)

	    var subscription = connection.subscribeToStreamFrom(stream)

	    subscription.on('event', function(evt) {
	    	subscribedEvents.push(evt)
	    	if(subscribedEvents.length >= 20) {
			    subscription.stop()
	    	}
	    }).on('dropped', function() {
	    	subscribedEvents.map(function(evt) {
	    		return evt.OriginalEvent.EventType
	    	}).should.eql(range(0, 20).map(function(num) {
	    		return 'et-' + num
	    	}))
	    	done()
	    }).on('error', done)

	   	async.series(range(10, 10).map(appendEvent), function(err) {
	   		if(err) return done(err)
	   	})
    })
  })

  it('filter_events_and_keep_listening_to_new_ones', function(done) {
    var stream = 'filter_events_and_keep_listening_to_new_ones'
    	, subscribedEvents = []

    function appendEvent(eventNumber) {
    	return function(cb) {
	    	var appendData = {
			    		expectedVersion: eventNumber - 1
			    	, events: client.createEventData(uuid.v4(), 'et-' + eventNumber, false, new Buffer(3))
			    	}
			  connection.appendToStream(stream, appendData, cb)
    	}
    }

    async.series(range(0, 20).map(appendEvent) , function(err) {
    	if(err) return done(err)

	    var subData = {
	    			startProcessingAfter: 9
	    		}
	    	, subscription = connection.subscribeToStreamFrom(stream, subData)

	    subscription.on('event', function(evt) {
	    	subscribedEvents.push(evt)
	    	if(subscribedEvents.length >= 20) {
			    subscription.stop()
	    	}
	    }).on('dropped', function() {
	    	subscribedEvents.map(function(evt) {
	    		return evt.OriginalEvent.EventType
	    	}).should.eql(range(10, 20).map(function(num) {
	    		return 'et-' + num
	    	}))
	    	var lastEvent = subscribedEvents.concat([]).pop()
	    	lastEvent.OriginalEventNumber.should.equal(subscription.lastProcessedEventNumber)
	    	done()
	    }).on('error', done)

	   	async.series(range(20, 10).map(appendEvent), function(err) {
	   		if(err) return done(err)
	   	})
    })
  })

  it('filter_events_and_work_if_nothing_was_written_after_subscription', function(done) {
    var stream = 'filter_events_and_work_if_nothing_was_written_after_subscription'
    	, subscribedEvents = []

    function appendEvent(eventNumber) {
    	return function(cb) {
	    	var appendData = {
			    		expectedVersion: eventNumber - 1
			    	, events: client.createEventData(uuid.v4(), 'et-' + eventNumber, false, new Buffer(3))
			    	}
			  connection.appendToStream(stream, appendData, cb)
    	}
    }

    async.series(range(0, 20).map(appendEvent) , function(err) {
    	if(err) return done(err)

	    var subData = {
	    			startProcessingAfter: 9
	    		}
	    	, subscription = connection.subscribeToStreamFrom(stream, subData)

	    subscription.on('event', function(evt) {
	    	subscribedEvents.push(evt)
	    	if(subscribedEvents.length >= 10) {
			    subscription.stop()
	    	}
	    }).on('dropped', function() {
	    	subscribedEvents.map(function(evt) {
	    		return evt.OriginalEvent.EventType
	    	}).should.eql(range(10, 10).map(function(num) {
	    		return 'et-' + num
	    	}))
	    	var lastEvent = subscribedEvents.concat([]).pop()
	    	lastEvent.OriginalEventNumber.should.equal(subscription.lastProcessedEventNumber)
	    	done()
	    }).on('error', done)
    })
  })

  after(function(done) {
  	connection.close(function() {
	  	es.on('exit', function(code, signal) {
		  	done()
	  	})
	  	es.on('error', done)
	  	es.kill()
  	})
  })
})