var client = require('../../../')
	, ges = require('ges-test-helper').external
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')

describe('connect', function() {
	var es
		, connection

	before(function(done) {
		es = ges(function(err, settings) {
			if(err) return done(err)

			connection = client(settings, done)
			es.addConnection(connection)
		})
	})

  it('should_not_throw_exception_when_server_is_down')
  it('should_throw_exception_when_trying_to_reopen_closed_connection')
  it('should_close_connection_after_configured_amount_of_failed_reconnections')
    
  after(function(done) {
  	es.cleanup(done)
  })
})


describe('not_connected_tests', function() {
	var es
		, connection

	before(function(done) {
		es = ges(function(err, settings) {
			if(err) return done(err)

			connection = client(settings, done)
			es.addConnection(connection)
		})
	})

  it('should_timeout_connection_after_configured_amount_time_on_conenct')
    
  after(function(done) {
  	es.cleanup(done)
  })
})

