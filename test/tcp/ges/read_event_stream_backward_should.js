var client = require('../../../')
	, ges = require('ges-test-helper')
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
		ges({ tcpPort: 5020 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5020 }, done)
		})
	})

  it('throw_if_count_le_zero')
    //var stream = 'read_event_stream_backward_should_throw_if_count_le_zero'
  it('notify_using_status_code_if_stream_not_found')
    //var stream = 'read_event_stream_backward_should_notify_using_status_code_if_stream_not_found'
  it('notify_using_status_code_if_stream_was_deleted')
    //var stream = 'read_event_stream_backward_should_notify_using_status_code_if_stream_was_deleted'
  it('return_no_events_when_called_on_empty_stream')
    //var stream = 'read_event_stream_backward_should_return_single_event_when_called_on_empty_stream'
  it('return_partial_slice_if_no_enough_events_in_stream')
    //var stream = 'read_event_stream_backward_should_return_partial_slice_if_no_enough_events_in_stream'
  it('return_events_reversed_compared_to_written')
    //var stream = 'read_event_stream_backward_should_return_events_reversed_compared_to_written'
  it('be_able_to_read_single_event_from_arbitrary_position')
    //var stream = 'read_event_stream_backward_should_be_able_to_read_single_event_from_arbitrary_position'
  it('be_able_to_read_first_event')
    //var stream = 'read_event_stream_backward_should_be_able_to_read_first_event'
  it('be_able_to_read_last_event')
    //var stream = 'read_event_stream_backward_should_be_able_to_read_last_event'
  it('be_able_to_read_slice_from_arbitrary_position')
    //var stream = 'read_event_stream_backward_should_be_able_to_read_slice_from_arbitrary_position'

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
