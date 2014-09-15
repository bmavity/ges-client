var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('read_all_events_forward_with_linkto_passed_max_count', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5015 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5015 }, done)
		})
	})

  it('one_event_is_read')


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