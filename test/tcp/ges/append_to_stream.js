var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')

describe('append to stream', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 3456 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 3456 }, done)
		})
	})

  it('should_allow_appending_zero_events_to_stream_with_no_problems', function(done) {
    var stream1 = 'should_allow_appending_zero_events_to_stream_with_no_problems1'
    var stream2 = 'should_allow_appending_zero_events_to_stream_with_no_problems2'
    	, noStream = client.expectedVersion.noStream
    	, any = client.expectedVersion.any

    function readStream2() {
	    connection.appendToStream(stream2, noStream, function(err, appendResult) {
	    	if(err) return done(err)
	    	appendResult.NextExpectedVersion.should.equal(-1)

		    connection.appendToStream(stream2, any, function(err, appendResult) {
		    	if(err) return done(err)
		    	appendResult.NextExpectedVersion.should.equal(-1)

			    connection.appendToStream(stream2, noStream, function(err, appendResult) {
			    	if(err) return done(err)
			    	appendResult.NextExpectedVersion.should.equal(-1)

				    connection.appendToStream(stream2, any, function(err, appendResult) {
				    	if(err) return done(err)
				    	appendResult.NextExpectedVersion.should.equal(-1)

				    	connection.readStreamEventsForward(stream2, { start: 0, count: 2 }, function(err, readResult) {
				    		if(err) return cb(err)

				    		readResult.Events.length.should.equal(0)
					    	done()
				    	})
				    })
			    })
		    })
	    })
    }

    connection.appendToStream(stream1, any, function(err, appendResult) {
    	if(err) return done(err)
    	appendResult.NextExpectedVersion.should.equal(-1)

	    connection.appendToStream(stream1, noStream, function(err, appendResult) {
	    	if(err) return done(err)
	    	appendResult.NextExpectedVersion.should.equal(-1)

		    connection.appendToStream(stream1, any, function(err, appendResult) {
		    	if(err) return done(err)
		    	appendResult.NextExpectedVersion.should.equal(-1)

			    connection.appendToStream(stream1, noStream, function(err, appendResult) {
			    	if(err) return done(err)
			    	appendResult.NextExpectedVersion.should.equal(-1)

			    	connection.readStreamEventsForward(stream1, { start: 0, count: 2 }, function(err, readResult) {
			    		if(err) return cb(err)

			    		readResult.Events.length.should.equal(0)
				    	readStream2()
			    	})
			    })
		    })
	    })
    })
  })

  it('should_create_stream_with_no_stream_exp_ver_on_first_write_if_does_not_exist', function(done) {
    var stream = 'should_create_stream_with_no_stream_exp_ver_on_first_write_if_does_not_exist'

    connection.appendToStream(stream, client.expectedVersion.noStream, createTestEvent(), function(err, appendResult) {
    	if(err) return done(err)
    	
    	appendResult.NextExpectedVersion.should.equal(0)

    	connection.readStreamEventsForward(stream, { start: 0, count: 2 }, function(err, readResult) {
    		if(err) return cb(err)

    		readResult.Events.length.should.equal(1)
	    	done()
    	})
    })
  })

  it('should_create_stream_with_any_exp_ver_on_first_write_if_does_not_exist', function(done) {
  	var stream = 'should_create_stream_with_any_exp_ver_on_first_write_if_does_not_exist'

    connection.appendToStream(stream, client.expectedVersion.any, createTestEvent(), function(err, appendResult) {
    	if(err) return done(err)
    	
    	appendResult.NextExpectedVersion.should.equal(0)

    	connection.readStreamEventsForward(stream, { start: 0, count: 2 }, function(err, readResult) {
    		if(err) return cb(err)

    		readResult.Events.length.should.equal(1)
	    	done()
    	})
    })
  })
  
  it('should_fail_writing_with_correct_exp_ver_to_deleted_stream')
    //var stream = 'should_fail_writing_with_correct_exp_ver_to_deleted_stream'

  it('should_return_log_position_when_writing', function(done) {
    var stream = 'should_return_log_position_when_writing'

    connection.appendToStream(stream, client.expectedVersion.emptyStream, createTestEvent(), function(err, appendResult) {
    	if(err) return done(err)
    	
    	appendResult.LogPosition.PreparePosition.should.be.greaterThan(0)
    	appendResult.LogPosition.CommitPosition.should.be.greaterThan(0)

    	done()
    })
  })

  it('should_fail_writing_with_any_exp_ver_to_deleted_stream')
    //var stream = 'should_fail_writing_with_any_exp_ver_to_deleted_stream'

  it('should_fail_writing_with_invalid_exp_ver_to_deleted_stream')
    //var stream = 'should_fail_writing_with_invalid_exp_ver_to_deleted_stream'

  it('should_append_with_correct_exp_ver_to_existing_stream', function(done) {
    var stream = 'should_append_with_correct_exp_ver_to_existing_stream'

		connection.appendToStream(stream, client.expectedVersion.emptyStream, createTestEvent(), function(err, appendResult) {
    	if(err) return done(err)
    	
    	connection.appendToStream(stream, 0, createTestEvent(), function(err, nextAppendResult) {
    		(err ===  null).should.be.true

	    	done()
    	})
    })
  })

  it('should_append_with_any_exp_ver_to_existing_stream', function(done) {
  	var stream = 'should_append_with_any_exp_ver_to_existing_stream'

		connection.appendToStream(stream, client.expectedVersion.emptyStream, createTestEvent(), function(err, appendResult) {
    	if(err) return done(err)
    	
    	connection.appendToStream(stream, client.expectedVersion.any, createTestEvent(), function(err, nextAppendResult) {
    		(err ===  null).should.be.true

	    	done()
    	})
    })
  })
  
  it('should_fail_appending_with_wrong_exp_ver_to_existing_stream', function(done) {
    var stream = 'should_fail_appending_with_wrong_exp_ver_to_existing_stream'

		connection.appendToStream(stream, 1, createTestEvent(), function(err, appendResult) {
  		(err === null).should.not.be.true
    	done()
    })
  })

  it('can_append_multiple_events_at_once', function(done) {
    var stream = 'can_append_multiple_events_at_once'
    	, allEvents = range(0, 100).map(function(i) {
	    		return createTestEvent(i.toString(), i.toString())
	    	})

		connection.appendToStream(stream, client.expectedVersion.emptyStream, allEvents, function(err, appendResult) {
    	if(err) return done(err)
    	
    	appendResult.NextExpectedVersion.should.equal(99)
    	done()
    })
  })

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


/*
   	describe('ssl_append_to_stream')
  it('should_allow_appending_zero_events_to_stream_with_no_problems')
    //var stream = 'should_allow_appending_zero_events_to_stream_with_no_problems'
  it('should_create_stream_with_no_stream_exp_ver_on_first_write_if_does_not_exist')
    //var stream = 'should_create_stream_with_no_stream_exp_ver_on_first_write_if_does_not_exist'
  it('should_create_stream_with_any_exp_ver_on_first_write_if_does_not_exist')
    //var stream = 'should_create_stream_with_any_exp_ver_on_first_write_if_does_not_exist'
  it('should_fail_writing_with_correct_exp_ver_to_deleted_stream')
    //var stream = 'should_fail_writing_with_correct_exp_ver_to_deleted_stream'
  it('should_fail_writing_with_any_exp_ver_to_deleted_stream')
    //var stream = 'should_fail_writing_with_any_exp_ver_to_deleted_stream'
  it('should_fail_writing_with_invalid_exp_ver_to_deleted_stream')
    //var stream = 'should_fail_writing_with_invalid_exp_ver_to_deleted_stream'
  it('should_append_with_correct_exp_ver_to_existing_stream')
    //var stream = 'should_append_with_correct_exp_ver_to_existing_stream'
  it('should_append_with_any_exp_ver_to_existing_stream')
    //var stream = 'should_append_with_any_exp_ver_to_existing_stream'
  it('should_return_log_position_when_writing')
    //var stream = 'should_return_log_position_when_writing'
  it('should_fail_appending_with_wrong_exp_ver_to_existing_stream')
    //var stream = 'should_fail_appending_with_wrong_exp_ver_to_existing_stream'
  it('can_append_multiple_events_at_once')
    //var stream = 'can_append_multiple_events_at_once'
*/
