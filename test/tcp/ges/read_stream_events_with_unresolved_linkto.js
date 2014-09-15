var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('read_stream_events_with_unresolved_linkto', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5021 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5021 }, done)
		})
	})

  it('ensure_deleted_stream')
  it('returns_unresolved_linkto')

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
