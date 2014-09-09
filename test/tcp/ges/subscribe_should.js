var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')

describe('subscribe_should', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 1234 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 1234 })

			connection.on('connect', function() {
				done()
			})

			connection.on('error', done)
		})
	})

  it('be_able_to_subscribe_to_non_existing_stream_and_then_catch_new_event', function(done) {
    var stream = 'subscribe_should_be_able_to_subscribe_to_non_existing_stream_and_then_catch_created_event'
    	, subscription = connection.subscribeToStream(stream)

    subscription.on('event', function(evt) {
    	true.should.be.true
    	done()
    })

    connection.appendToStream(stream, client.expectedVersion.emptyStream, createTestEvent(), function(err) {
    	if(err) return done(err)
    })
  })

  it('allow_multiple_subscriptions_to_same_stream', function(done) {
    var stream = 'subscribe_should_allow_multiple_subscriptions_to_same_stream'
    	, sub1 = connection.subscribeToStream(stream)
    	, sub2 = connection.subscribeToStream(stream)
    	, evtSub1
    	, evtSub2

    function testForFinish() {
    	if(evtSub1 && evtSub2) {
	    	true.should.be.true
	    	done()
    	}
    }

    sub1.on('event', function(evt) {
    	evtSub1 = true
    	testForFinish()
    })

    sub2.on('event', function(evt) {
    	evtSub2 = true
    	testForFinish()
    })

    connection.appendToStream(stream, client.expectedVersion.emptyStream, createTestEvent(), function(err) {
    	if(err) return done(err)
    })
  })

  it('call_dropped_callback_after_unsubscribe_method_call', function(done) {
    var stream = 'subscribe_should_call_dropped_callback_after_unsubscribe_method_call'
    	, subscription = connection.subscribeToStream(stream)

    subscription.on('dropped', function(evt) {
    	true.should.be.true
    	done()
    })

    subscription.unsubscribe()
  })

  it('catch_deleted_events_as_well')
    //var stream = 'subscribe_should_catch_created_and_deleted_events_as_well'

  after(function(done) {
  	es.on('exit', function(code, signal) {
	  	done()
  	})
  	es.on('error', done)
  	es.kill()
  })
})
