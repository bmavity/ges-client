var client = require('../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../createTestEvent')
	, range = require('../range')
	, streamWriter = require('../streamWriter')
	, eventStreamCounter = require('../eventStreamCounter')

describe('connect', function() {
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

  it('should_not_throw_exception_when_server_is_down')
  it('should_throw_exception_when_trying_to_reopen_closed_connection')
  it('should_close_connection_after_configured_amount_of_failed_reconnections')
    
  after(function(done) {
  	es.on('exit', function(code, signal) {
	  	done()
  	})
  	es.on('error', done)
  	es.kill()
  })
})


describe('not_connected_tests', function() {
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

  it('should_timeout_connection_after_configured_amount_time_on_conenct')
    
  after(function(done) {
  	es.on('exit', function(code, signal) {
	  	done()
  	})
  	es.on('error', done)
  	es.kill()
  })
})

