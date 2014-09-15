var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('read_event_of_linkto_to_deleted_event', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5019 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5019 }, done)
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


describe('read_allevents_backward_with_linkto_deleted_event', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5018 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5018 }, done)
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