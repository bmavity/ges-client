var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('read_all_events_forward_with_hard_deleted_stream_should', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5014 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5014 }, done)
		})
	})

  it('ensure_deleted_stream')
  it('returns_all_events_including_tombstone')
            
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