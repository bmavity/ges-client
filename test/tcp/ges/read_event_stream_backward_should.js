var client = require('../../../')
	, ges = require('ges-test-helper').external
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('read_event_stream_backward_should', function() {
	var es
		, connection

	before(function(done) {
		es = ges(function(err, settings) {
			if(err) return done(err)

			connection = client(settings, done)
			es.addConnection(connection)
		})
	})

  it('throw_if_count_le_zero', function(done) {
    var stream = 'read_event_stream_backward_should_throw_if_count_le_zero'
			, options = {
					start: 0
				, count: 0
				}
		connection.readStreamEventsBackward(stream, options, function(err, result) {
	  	err.message.should.endWith('count must be positive.')
			done()
		})
  })

  it('notify_using_status_code_if_stream_not_found', function(done) {
    var stream = 'read_event_stream_backward_should_notify_using_status_code_if_stream_not_found'
			, options = {
					start: client.streamPosition.end
				, count: 1
				}
		connection.readStreamEventsBackward(stream, options, function(err, result) {
			if(err) return done(err)

	  	result.Status.should.equal('NoStream')
			done()
		})
  })

  it('notify_using_status_code_if_stream_was_deleted', function(done) {
    var stream = 'read_event_stream_backward_should_notify_using_status_code_if_stream_was_deleted'
    	, deleteData = {
    			expectedVersion: client.expectedVersion.emptyStream
    		, hardDelete: true
	    	}

    connection.deleteStream(stream, deleteData, function(err, deleteResult) {
			var readOptions = {
						start: client.streamPosition.end
					, count: 1
					}
			connection.readStreamEventsBackward(stream, readOptions, function(err, result) {
				if(err) return done(err)

		  	result.Status.should.equal('StreamDeleted')
				done()
			})
    })
  })

  it('return_no_events_when_called_on_empty_stream', function(done) {
    var stream = 'read_event_stream_backward_should_return_single_event_when_called_on_empty_stream'
	    	, options = {
	    		start: client.streamPosition.end
	    	, count: 1
	    	}
    connection.readStreamEventsBackward(stream, options, function(err, result) {
    	if(err) return done(err)

    	result.Events.length.should.equal(0)
	    done()
    })
  })

  it('return_partial_slice_if_no_enough_events_in_stream', function(done) {
    var stream = 'read_event_stream_backward_should_return_partial_slice_if_no_enough_events_in_stream'
	    , appendData = {
					expectedVersion: client.expectedVersion.emptyStream
				, events: createTestEvent(range(0, 10))
		    }

		connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	
    	connection.readStreamEventsBackward(stream, { start: 1, count: 5 }, function(err, readResult) {
    		if(err) return cb(err)

    		readResult.Events.length.should.equal(2)
	    	done()
    	})
    })
  })

  it('return_events_reversed_compared_to_written', function(done) {
    var stream = 'read_event_stream_backward_should_return_events_reversed_compared_to_written'
	    , appendData = {
					expectedVersion: client.expectedVersion.emptyStream
				, events: createTestEvent(range(0, 10))
		    }

		connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	var readData = {
    				start: client.streamPosition.end
    			, count: appendData.events.length
    			}
    	
    	connection.readStreamEventsBackward(stream, readData, function(err, readResult) {
    		if(err) return cb(err)

    		readResult.Events.should.matchEvents(reverse(appendData.events))
	    	done()
    	})
    })
  })

  it('be_able_to_read_single_event_from_arbitrary_position', function(done) {
    var stream = 'read_event_stream_backward_should_be_able_to_read_single_event_from_arbitrary_position'
	    , appendData = {
					expectedVersion: client.expectedVersion.emptyStream
				, events: createTestEvent(range(0, 10))
		    }

		connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	var readData = {
    				start: 7
    			, count: 1
    			}
    	
    	connection.readStreamEventsBackward(stream, readData, function(err, readResult) {
    		if(err) return cb(err)

    		readResult.Events.should.matchEvents(appendData.events[7])
	    	done()
    	})
    })
  })

  it('be_able_to_read_first_event', function(done) {
    var stream = 'read_event_stream_backward_should_be_able_to_read_first_event'
	    , appendData = {
					expectedVersion: client.expectedVersion.emptyStream
				, events: createTestEvent(range(0, 10))
		    }

		connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	var readData = {
    				start: client.streamPosition.start
    			, count: 1
    			}
    	
    	connection.readStreamEventsBackward(stream, readData, function(err, readResult) {
    		if(err) return cb(err)

    		readResult.Events.length.should.equal(1)
	    	done()
    	})
    })
  })

  it('be_able_to_read_last_event', function(done) {
    var stream = 'read_event_stream_backward_should_be_able_to_read_last_event'
	    , appendData = {
					expectedVersion: client.expectedVersion.emptyStream
				, events: createTestEvent(range(0, 10))
		    }

		connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	var readData = {
    				start: client.streamPosition.end
    			, count: 1
    			}
    	
    	connection.readStreamEventsBackward(stream, readData, function(err, readResult) {
    		if(err) return cb(err)

    		readResult.Events.should.matchEvents(appendData.events[9])
	    	done()
    	})
    })
  })

  it('be_able_to_read_slice_from_arbitrary_position', function(done) {
    var stream = 'read_event_stream_backward_should_be_able_to_read_slice_from_arbitrary_position'
	    , appendData = {
					expectedVersion: client.expectedVersion.emptyStream
				, events: createTestEvent(range(0, 10))
		    }

		connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	var readData = {
    				start: 3
    			, count: 2
    			}
    	
    	connection.readStreamEventsBackward(stream, readData, function(err, readResult) {
    		if(err) return cb(err)

    		readResult.Events.should.matchEvents(reverse(appendData.events.slice(2, 4)))
	    	done()
    	})
    })
  })

  after(function(done) {
  	es.cleanup(done)
  })
})

function reverse(events) {
	return events.reduce(function(all, evt) {
		all.unshift(evt)
		return all
	}, [])
}
