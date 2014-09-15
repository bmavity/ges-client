var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('subscribe_to_all_should', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5023 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5023 }, done)
		})
	})

  it('allow_multiple_subscriptions')
    //var stream = 'subscribe_to_all_should_allow_multiple_subscriptions'
  it('catch_deleted_events_as_well')
    //var stream = 'subscribe_to_all_should_catch_created_and_deleted_events_as_well'

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
