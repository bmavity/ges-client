var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('read_all_events_forward_with_linkto_to_deleted_event', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5016 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5016 }, done)
		})
	})

  it('one_event_is_read')
  it('the_linked_event_is_not_resolved')
  it('the_link_event_is_included')
  it('the_event_is_not_resolved')


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