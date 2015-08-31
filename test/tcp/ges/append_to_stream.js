var client = require('../../../')
	, ges = require('ges-test-helper').external
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')

describe('append to stream', function() {
	var es
		, connection

	before(function(done) {
		es = ges(function(err, settings) {
			if(err) return done(err)

			connection = client(settings, done)
			es.addConnection(connection)
		})
	})

  it('should_allow_appending_zero_events_to_stream_with_no_problems', function(done) {
    var stream1 = 'should_allow_appending_zero_events_to_stream_with_no_problems1'
    var stream2 = 'should_allow_appending_zero_events_to_stream_with_no_problems2'
    	, noStream = { expectedVersion: client.expectedVersion.noStream }
    	, any = { expectedVersion: client.expectedVersion.any }

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
			    		if(err) return done(err)

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
    	, appendData = {
		    	expectedVersion: client.expectedVersion.noStream
	    	, events: createTestEvent()
	    	}

    connection.appendToStream(stream, appendData, function(err, appendResult) {
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
    	, appendData = {
		    	expectedVersion: client.expectedVersion.any
	    	, events: createTestEvent()
	    	}

    connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	
    	appendResult.NextExpectedVersion.should.equal(0)

    	connection.readStreamEventsForward(stream, { start: 0, count: 2 }, function(err, readResult) {
    		if(err) return cb(err)

    		readResult.Events.length.should.equal(1)
	    	done()
    	})
    })
  })
  
  it('should_fail_writing_with_correct_exp_ver_to_deleted_stream', function(done) {
    var stream = 'should_fail_writing_with_correct_exp_ver_to_deleted_stream'
    	, deleteData = {
		    	expectedVersion: client.expectedVersion.emptyStream
	    	, hardDelete: true
	    	}
    connection.deleteStream(stream, deleteData, function(err, deleteResult) {
    	if(err) return done(err)
    	var appendData = {
			    	expectedVersion: client.expectedVersion.noStream
		    	, events: createTestEvent()
		    	}

	    connection.appendToStream(stream, appendData, function(err, appendResult) {
	    	(err === null).should.be.false
	    	done()
	    })
	  })
  })

  it('should_return_log_position_when_writing', function(done) {
    var stream = 'should_return_log_position_when_writing'
    	, appendData = {
		    	expectedVersion: client.expectedVersion.emptyStream
	    	, events: createTestEvent()
	    	}

    connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	
    	appendResult.LogPosition.PreparePosition.should.be.greaterThan(0)
    	appendResult.LogPosition.CommitPosition.should.be.greaterThan(0)

    	done()
    })
  })

  it('should_fail_writing_with_any_exp_ver_to_deleted_stream', function(done) {
    var stream = 'should_fail_writing_with_any_exp_ver_to_deleted_stream'
    	, deleteData = {
		    	expectedVersion: client.expectedVersion.emptyStream
	    	, hardDelete: true
	    	}
    connection.deleteStream(stream, deleteData, function(err, deleteResult) {
    	if(err) return done(err)
    	var appendData = {
			    	expectedVersion: client.expectedVersion.any
		    	, events: createTestEvent()
		    	}

	    connection.appendToStream(stream, appendData, function(err, appendResult) {
	    	(err === null).should.be.false
	    	done()
	    })
	  })
  })

  it('should_fail_writing_with_invalid_exp_ver_to_deleted_stream', function(done) {
    var stream = 'should_fail_writing_with_invalid_exp_ver_to_deleted_stream'
    	, deleteData = {
		    	expectedVersion: client.expectedVersion.emptyStream
	    	, hardDelete: true
	    	}
    connection.deleteStream(stream, deleteData, function(err, deleteResult) {
    	if(err) return done(err)
    	var appendData = {
			    	expectedVersion: 5
		    	, events: createTestEvent()
		    	}

	    connection.appendToStream(stream, appendData, function(err, appendResult) {
	    	(err === null).should.be.false
	    	done()
	    })
	  })
  })

  it('should_append_with_correct_exp_ver_to_existing_stream', function(done) {
    var stream = 'should_append_with_correct_exp_ver_to_existing_stream'
    	, appendData1 = {
		    	expectedVersion: client.expectedVersion.emptyStream
	    	, events: createTestEvent()
	    	}
    	, appendData2 = {
		    	expectedVersion: 0
	    	, events: createTestEvent()
	    	}

    connection.appendToStream(stream, appendData1, function(err, appendResult) {
    	if(err) return done(err)
    	
    	connection.appendToStream(stream, appendData2, function(err, nextAppendResult) {
    		(err ===  null).should.be.true

	    	done()
    	})
    })
  })

  it('should_append_with_any_exp_ver_to_existing_stream', function(done) {
  	var stream = 'should_append_with_any_exp_ver_to_existing_stream'
    	, appendData1 = {
		    	expectedVersion: client.expectedVersion.emptyStream
	    	, events: createTestEvent()
	    	}
	    , appendData2 = {
		    	expectedVersion: client.expectedVersion.any
	    	, events: createTestEvent()
		    }

    connection.appendToStream(stream, appendData1, function(err, appendResult) {
    	if(err) return done(err)
    	
    	connection.appendToStream(stream, appendData2, function(err, nextAppendResult) {
    		(err ===  null).should.be.true

	    	done()
    	})
    })
  })
  
  it('should_fail_appending_with_wrong_exp_ver_to_existing_stream', function(done) {
    var stream = 'should_fail_appending_with_wrong_exp_ver_to_existing_stream'
    	, appendData = {
		    	expectedVersion: 1
	    	, events: createTestEvent()
	    	}

    connection.appendToStream(stream, appendData, function(err, appendResult) {
  		(err === null).should.not.be.true
    	done()
    })
  })

  it('can_append_multiple_events_at_once', function(done) {
    var stream = 'can_append_multiple_events_at_once'
    	, allEvents = range(0, 100).map(function(i) {
	    		return createTestEvent(i.toString(), i.toString())
	    	})
    	, appendData = {
		    	expectedVersion: client.expectedVersion.emptyStream
	    	, events: allEvents
	    	}

    connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	
    	appendResult.NextExpectedVersion.should.equal(99)
    	done()
    })
  })

  after(function(done) {
  	es.cleanup(done)
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
