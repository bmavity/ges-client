var client = require('../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')

describe('read event stream forward should', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 2345 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 2345 })

			connection.on('connect', function() {
				done()
			})

			connection.on('error', done)
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

  it('notify_using_status_code_if_stream_was_deleted')
      //'read_event_stream_forward_should_notify_using_status_code_if_stream_was_deleted'

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

  it('return_empty_slice_when_called_on_non_existing_range')
      //'read_event_stream_forward_should_return_empty_slice_when_called_on_non_existing_range'
  it('return_partial_slice_if_not_enough_events_in_stream')
      //'read_event_stream_forward_should_return_partial_slice_if_no_enough_events_in_stream'
  it('return_partial_slice_when_got_int_max_value_as_maxcount')
      //'read_event_stream_forward_should_return_partial_slice_when_got_int_max_value_as_maxcount'
  it('return_events_in_same_order_as_written')
      //'read_event_stream_forward_should_return_events_in_same_order_as_written'
  it('be_able_to_read_single_event_from_arbitrary_position')
      //'read_event_stream_forward_should_be_able_to_read_from_arbitrary_position'
  it('be_able_to_read_slice_from_arbitrary_position')
      //'read_event_stream_forward_should_be_able_to_read_slice_from_arbitrary_position'

  after(function(done) {
  	es.on('exit', function(code, signal) {
  		console.log('Exited with ', code, signal)
	  	done()
  	})
  	es.kill()
  })
})

