var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')

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

	it('be_able_to_subscribe_to_non_existing_stream')
    //var stream = 'be_able_to_subscribe_to_non_existing_stream'
  it('be_able_to_subscribe_to_non_existing_stream_and_then_catch_event')
    //var stream = 'be_able_to_subscribe_to_non_existing_stream_and_then_catch_event'
  it('allow_multiple_subscriptions_to_same_stream')
    //var stream = 'allow_multiple_subscriptions_to_same_stream'
  it('call_dropped_callback_after_stop_method_call')
    //var stream = 'call_dropped_callback_after_stop_method_call'
  it('read_all_existing_events_and_keep_listening_to_new_ones')
    //var stream = 'read_all_existing_events_and_keep_listening_to_new_ones'
  it('filter_events_and_keep_listening_to_new_ones')
    //var stream = 'filter_events_and_keep_listening_to_new_ones'
  it('filter_events_and_work_if_nothing_was_written_after_subscription')
    //var stream = 'filter_events_and_work_if_nothing_was_written_after_subscription'

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