var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('subscribe_to_all_catching_up_should', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5022 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5022 }, done)
		})
	})

  it('call_dropped_callback_after_stop_method_call')
  it('be_able_to_subscribe_to_empty_db')
  it('read_all_existing_events_and_keep_listening_to_new_ones')
  it('filter_events_and_keep_listening_to_new_ones')
  it('filter_events_and_work_if_nothing_was_written_after_subscription')

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
