var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('when_committing_empty_transaction', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5024 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5024 }, done)
		})
	})

  it('following_append_with_correct_expected_version_are_commited_correctly')
  it('following_append_with_expected_version_any_are_commited_correctly')
  it('committing_first_event_with_expected_version_no_stream_is_idempotent')
  it('trying_to_append_new_events_with_expected_version_no_stream_fails')

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
