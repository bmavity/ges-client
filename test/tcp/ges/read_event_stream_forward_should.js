var client = require('../../../')
	, ges = require('ges-test-helper').external
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')

require('../../shouldExtensions')

describe('read event stream forward should', function() {
	var es
		, connection

	before(function(done) {
		es = ges(function(err, settings) {
			if(err) return done(err)

			connection = client(settings, done)
			es.addConnection(connection)
		})
	})

	it('throw if count le zero', function(done) {
		var stream = 'read_event_stream_forward_should_throw_if_count_le_zero' 
			, options = {
					start: 0
				, count: 0
				}
		connection.readStreamEventsForward(stream, options, function(err, result) {
	  	err.message.should.endWith('count must be positive.')
			done()
		})
  })

	it('throw if start lt zero', function(done) {
		var stream = 'read_event_stream_forward_should_throw_if_start_lt_zero' 
			, options = {
					start: -1
				, count: 1
				}
		connection.readStreamEventsForward(stream, options, function(err, result) {
	  	err.message.should.endWith('start must be non-negative.')
			done()
		})
  })

  it('notifiy using status code if stream not found', function(done) {
		var stream = 'read_event_stream_forward_should_notify_using_status_code_if_stream_not_found' 
			, options = {
					start: 0
				, count: 1
				}
		connection.readStreamEventsForward(stream, options, function(err, result) {
			if(err) return done(err)

	  	result.Status.should.equal('NoStream')
			done()
		})
  })

  it('notify_using_status_code_if_stream_was_deleted', function(done) {
    var stream = 'read_event_stream_forward_should_notify_using_status_code_if_stream_was_deleted'
    	, deleteData = {
    			expectedVersion: client.expectedVersion.emptyStream
    		, hardDelete: true
	    	}

    connection.deleteStream(stream, deleteData, function(err, deleteResult) {
			var readOptions = {
						start: 0
					, count: 1
					}
			connection.readStreamEventsForward(stream, readOptions, function(err, result) {
				if(err) return done(err)

		  	result.Status.should.equal('StreamDeleted')
				done()
			})
    })
  })

  it('return no events when called on empty stream', function(done) {
    var stream = 'read_event_stream_forward_should_return_single_event_when_called_on_empty_stream'
    	, options = {
    		start: 0
    	, count: 1
    	}
    connection.readStreamEventsForward(stream, options, function(err, result) {
    	if(err) return done(err)

    	result.Events.length.should.equal(0)
	    done()
    })
  })

  it('return_empty_slice_when_called_on_non_existing_range', function(done) {
    var stream = 'read_event_stream_forward_should_return_empty_slice_when_called_on_non_existing_range'
	    , allEvents = range(0, 10).map(function(i) {
	    		return createTestEvent(i.toString())
	    	})
	    , appendData = {
					expectedVersion: client.expectedVersion.emptyStream
				, events: allEvents
		    }

		connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	
    	connection.readStreamEventsForward(stream, { start: 11, count: 5 }, function(err, readResult) {
    		if(err) return cb(err)

    		readResult.Events.length.should.equal(0)
	    	done()
    	})
    })
  })

  it('return_partial_slice_if_not_enough_events_in_stream', function(done) {
    var stream = 'read_event_stream_forward_should_return_partial_slice_if_no_enough_events_in_stream'
	    , allEvents = range(0, 10).map(function(i) {
	    		return createTestEvent(i.toString())
	    	})
	    , appendData = {
					expectedVersion: client.expectedVersion.emptyStream
				, events: allEvents
		    }

		connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	
    	connection.readStreamEventsForward(stream, { start: 9, count: 5 }, function(err, readResult) {
    		if(err) return cb(err)

    		readResult.Events.length.should.equal(1)
	    	done()
    	})
    })
  })

  it('return_partial_slice_when_got_int_max_value_as_maxcount', function(done) {
    var stream = 'read_event_stream_forward_should_return_partial_slice_when_got_int_max_value_as_maxcount'
	    , allEvents = range(0, 10).map(function(i) {
	    		return createTestEvent(i.toString())
	    	})
	    , appendData = {
					expectedVersion: client.expectedVersion.emptyStream
				, events: allEvents
		    }

		connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	
    	connection.readStreamEventsForward(stream, { start: client.streamPosition.start, count: client.maxRecordCount }, function(err, readResult) {
    		if(err) return cb(err)

    		readResult.Events.length.should.equal(10)
	    	done()
    	})
    })
  })

/*
  it('return_events_in_same_order_as_written', function(done) {
    var stream = 'read_event_stream_forward_should_return_events_in_same_order_as_written'
	    , allEvents = range(0, 10).map(function(i) {
	    		return createTestEvent(i.toString())
	    	})

		connection.appendToStream(stream, client.expectedVersion.emptyStream, allEvents, function(err, appendResult) {
    	if(err) return done(err)

    	var opts = { start: client.streamPosition.start, count: allEvents.length }
    	connection.readStreamEventsForward(stream, opts, function(err, readResult) {
    		if(err) return done(err)

    		readResult.Events.should.matchEvents(allEvents)
	    	done()
    	})
    })
  })

  it('be_able_to_read_single_event_from_arbitrary_position', function(done) {
    var stream = 'read_event_stream_forward_should_be_able_to_read_from_arbitrary_position'
	    , allEvents = range(0, 10).map(function(i) {
	    		return createTestEvent(i.toString())
	    	})

		connection.appendToStream(stream, client.expectedVersion.emptyStream, allEvents, function(err, appendResult) {
    	if(err) return done(err)

    	var opts = { start: 5, count: 1 }
    	connection.readStreamEventsForward(stream, opts, function(err, readResult) {
    		if(err) return done(err)

    		readResult.Events[0].should.matchEvent(allEvents[5])
	    	done()
    	})
    })
  })

*/
  it('be_able_to_read_slice_from_arbitrary_position', function(done) {
    var stream = 'read_event_stream_forward_should_be_able_to_read_slice_from_arbitrary_position'
	    , allEvents = range(0, 10).map(function(i) {
	    		return createTestEvent(i.toString())
	    	})
	    , appendData = {
					expectedVersion: client.expectedVersion.emptyStream
				, events: allEvents
		    }

		connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)

    	var opts = { start: 5, count: 2 }
    	connection.readStreamEventsForward(stream, opts, function(err, readResult) {
    		if(err) return done(err)

  			readResult.Events.should.matchEvents(allEvents.slice(5, 7))
	    	done()
    	})
    })
  })

  after(function(done) {
  	es.cleanup(done)
  })
})

