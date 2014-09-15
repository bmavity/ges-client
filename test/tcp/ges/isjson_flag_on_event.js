var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('isjson_flag_on_event', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5013 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5013 }, done)
		})
	})

  it('should_be_preserved_with_all_possible_write_and_read_methods')
    //var stream = 'should_be_preserved_with_all_possible_write_methods'


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