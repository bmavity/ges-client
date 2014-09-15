var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('when_having_max_count_set_for_stream', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5025 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5025 }, done)
		})
	})

  it('read_stream_forward_respects_max_count')
  it('read_stream_backward_respects_max_count')
  it('after_setting_less_strict_max_count_read_stream_forward_reads_more_events')
  it('after_setting_more_strict_max_count_read_stream_forward_reads_less_events')
  it('after_setting_less_strict_max_count_read_stream_backward_reads_more_events')
  it('after_setting_more_strict_max_count_read_stream_backward_reads_less_events')

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
