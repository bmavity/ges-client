var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('when_having_truncatebefore_set_for_stream', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5026 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5026 }, done)
		})
	})

  it('read_event_respects_truncatebefore')
    //var stream = 'read_event_respects_truncatebefore'
  it('read_stream_forward_respects_truncatebefore')
    //var stream = 'read_stream_forward_respects_truncatebefore'
  it('read_stream_backward_respects_truncatebefore')
    //var stream = 'read_stream_backward_respects_truncatebefore'
  it('after_setting_less_strict_truncatebefore_read_event_reads_more_events')
    //var stream = 'after_setting_less_strict_truncatebefore_read_event_reads_more_events'
  it('after_setting_more_strict_truncatebefore_read_event_reads_less_events')
    //var stream = 'after_setting_more_strict_truncatebefore_read_event_reads_less_events'
  it('less_strict_max_count_doesnt_change_anything_for_event_read')
    //var stream = 'less_strict_max_count_doesnt_change_anything_for_event_read'
  it('more_strict_max_count_gives_less_events_for_event_read')
    //var stream = 'more_strict_max_count_gives_less_events_for_event_read'
  it('after_setting_less_strict_truncatebefore_read_stream_forward_reads_more_events')
    //var stream = 'after_setting_less_strict_truncatebefore_read_stream_forward_reads_more_events'
  it('after_setting_more_strict_truncatebefore_read_stream_forward_reads_less_events')
    //var stream = 'after_setting_more_strict_truncatebefore_read_stream_forward_reads_less_events'
  it('less_strict_max_count_doesnt_change_anything_for_stream_forward_read')
    //var stream = 'less_strict_max_count_doesnt_change_anything_for_stream_forward_read'
  it('more_strict_max_count_gives_less_events_for_stream_forward_read')
    //var stream = 'more_strict_max_count_gives_less_events_for_stream_forward_read'
  it('after_setting_less_strict_truncatebefore_read_stream_backward_reads_more_events')
    //var stream = 'after_setting_less_strict_truncatebefore_read_stream_backward_reads_more_events'
  it('after_setting_more_strict_truncatebefore_read_stream_backward_reads_less_events')
    //var stream = 'after_setting_more_strict_truncatebefore_read_stream_backward_reads_less_events'
  it('less_strict_max_count_doesnt_change_anything_for_stream_backward_read')
    //var stream = 'less_strict_max_count_doesnt_change_anything_for_stream_backward_read'
  it('more_strict_max_count_gives_less_events_for_stream_backward_read')
    //var stream = 'more_strict_max_count_gives_less_events_for_stream_backward_read'


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
