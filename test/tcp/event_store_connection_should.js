var client = require('../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../createTestEvent')
	, range = require('../range')
	, streamWriter = require('../streamWriter')
	, eventStreamCounter = require('../eventStreamCounter')

describe('event_store_connection_should', function() {
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

  it('not_throw_on_close_if_connect_was_not_called')
  it('not_throw_on_close_if_called_multiple_times')
  it('throw_on_connect_called_more_than_once')
  it('throw_on_connect_called_after_close')
  it('throw_invalid_operation_on_every_api_call_if_connect_was_not_called')
	
  after(function(done) {
  	es.on('exit', function(code, signal) {
	  	done()
  	})
  	es.on('error', done)
  	es.kill()
  })
})
