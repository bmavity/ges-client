var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, async = require('async')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')

describe('transaction', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5011 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5011 }, done)
		})
	})

  it('should_start_on_non_existing_stream_with_correct_exp_ver_and_create_stream_on_commit', function(done) {
    var stream = 'should_start_on_non_existing_stream_with_correct_exp_ver_and_create_stream_on_commit'
    	, transactionOptions = {
    			expectedVersion: client.expectedVersion.noStream
	    	}

    connection.startTransaction(stream, transactionOptions, function(err, transaction) {
    	if(err) return done(err)

    	transaction.write(createTestEvent(), function(err) {
    		if(err) return done(err)

    		transaction.commit(function(err, commitResult) {
    			if(err) return done(err)

    			commitResult.NextExpectedVersion.should.equal(0)
    			done()
    		})
    	})
    })
  })

  it('should_start_on_non_existing_stream_with_exp_ver_any_and_create_stream_on_commit', function(done) {
    var stream = 'should_start_on_non_existing_stream_with_exp_ver_any_and_create_stream_on_commit'
    	, transactionOptions = {
    			expectedVersion: client.expectedVersion.any
	    	}

    connection.startTransaction(stream, transactionOptions, function(err, transaction) {
    	if(err) return done(err)

    	transaction.write(createTestEvent(), function(err) {
    		if(err) return done(err)

    		transaction.commit(function(err, commitResult) {
    			if(err) return done(err)

    			commitResult.NextExpectedVersion.should.equal(0)
    			done()
    		})
    	})
    })
  })

  it('should_fail_to_commit_non_existing_stream_with_wrong_exp_ver', function(done) {
    var stream = 'should_fail_to_commit_non_existing_stream_with_wrong_exp_ver'
    	, transactionOptions = {
    			expectedVersion: 1
	    	}

    connection.startTransaction(stream, transactionOptions, function(err, transaction) {
    	if(err) return done(err)

    	transaction.write(createTestEvent(), function(err) {
    		if(err) return done(err)

    		transaction.commit(function(err, commitResult) {
    			should.not.be.null(err)
    			done()
    		})
    	})
    })
  })

  it('should_do_nothing_if_commits_no_events_to_empty_stream', function(done) {
    var stream = 'should_do_nothing_if_commits_no_events_to_empty_stream'
    	, transactionOptions = {
    			expectedVersion: client.expectedVersion.noStream
	    	}

    connection.startTransaction(stream, transactionOptions, function(err, transaction) {
    	if(err) return done(err)

  		transaction.commit(function(err, commitResult) {
    		if(err) return done(err)

    		commitResult.NextExpectedVersion.should.equal(-1)

    		var readOptions = {
    					start: 0
    				, count: 1
		    		}
    		connection.readStreamEventsForward(stream, readOptions, function(err, readResult) {
    			if(err) return done(err)

    			readResult.Events.length.should.equal(0)
    			done()
    		})
    	})
    })
  })

  it('should_do_nothing_if_transactionally_writing_no_events_to_empty_stream', function(done) {
    var stream = 'should_do_nothing_if_transactionally_writing_no_events_to_empty_stream'
    	, transactionOptions = {
    			expectedVersion: client.expectedVersion.noStream
	    	}

    connection.startTransaction(stream, transactionOptions, function(err, transaction) {
    	if(err) return done(err)

    	transaction.write(function(err) {
    		if(err) return done(err)

	  		transaction.commit(function(err, commitResult) {
	    		if(err) return done(err)

	    		commitResult.NextExpectedVersion.should.equal(-1)

	    		var readOptions = {
	    					start: 0
	    				, count: 1
			    		}
	    		connection.readStreamEventsForward(stream, readOptions, function(err, readResult) {
	    			if(err) return done(err)

	    			readResult.Events.length.should.equal(0)
	    			done()
	    		})
	    	})
		  })
    })
  })

  it('should_validate_expectations_on_commit', function(done) {
    var stream = 'should_validate_expectations_on_commit'
    	, transactionOptions = {
    			expectedVersion: 100500
	    	}

    connection.startTransaction(stream, transactionOptions, function(err, transaction) {
    	if(err) return done(err)

    	transaction.write(createTestEvent(), function(err) {
    		if(err) return done(err)

    		transaction.commit(function(err, commitResult) {
    			should.not.be.null(err)
    			err.message.should.equal('Wrong expected version.')
    			done()
    		})
    	})
    })
  })

  it('should_commit_when_writing_with_exp_ver_any_even_while_somene_is_writing_in_parallel')
    //var stream = 'should_commit_when_writing_with_exp_ver_any_even_while_somene_is_writing_in_parallel'

  it('should_fail_to_commit_if_started_with_correct_ver_but_committing_with_bad', function(done) {
    var stream = 'should_fail_to_commit_if_started_with_correct_ver_but_committing_with_bad'
    	, transactionOptions = {
    			expectedVersion: client.expectedVersion.emptyStream
	    	}

    connection.startTransaction(stream, transactionOptions, function(err, transaction) {
    	if(err) return done(err)
    	var appendOptions = {
	    			expectedVersion: client.expectedVersion.emptyStream
	    		, events: createTestEvent()
		    	}

		  connection.appendToStream(stream, appendOptions, function(err, appendResult) {
    		if(err) return done(err)

	    	transaction.write(createTestEvent(), function(err) {
	    		if(err) return done(err)

	    		transaction.commit(function(err, commitResult) {
	    			should.not.be.null(err)
	    			err.message.should.equal('Wrong expected version.')
	    			done()
	    		})
	    	})
		  })
    })
  })

  it('should_not_fail_to_commit_if_started_with_wrong_ver_but_committing_with_correct_ver', function(done) {
    var stream = 'should_not_fail_to_commit_if_started_with_wrong_ver_but_committing_with_correct_ver'
    	, transactionOptions = {
    			expectedVersion: 0
	    	}

    connection.startTransaction(stream, transactionOptions, function(err, transaction) {
    	if(err) return done(err)
    	var appendOptions = {
	    			expectedVersion: client.expectedVersion.emptyStream
	    		, events: createTestEvent()
		    	}

		  connection.appendToStream(stream, appendOptions, function(err, appendResult) {
    		if(err) return done(err)

	    	transaction.write(createTestEvent(), function(err) {
	    		if(err) return done(err)

	    		transaction.commit(function(err, commitResult) {
		    		if(err) return done(err)

		    		commitResult.NextExpectedVersion.should.equal(1)
	    			done()
	    		})
	    	})
		  })
    })
  })

  it('should_fail_to_commit_if_started_with_correct_ver_but_on_commit_stream_was_deleted', function(done) {
    var stream = 'should_fail_to_commit_if_started_with_correct_ver_but_on_commit_stream_was_deleted'
    	, transactionOptions = {
    			expectedVersion: client.expectedVersion.emptyStream
	    	}

    connection.startTransaction(stream, transactionOptions, function(err, transaction) {
    	if(err) return done(err)

    	transaction.write(createTestEvent(), function(err) {
    		if(err) return done(err)
    		var deleteOptions = {
		    			expectedVersion: client.expectedVersion.emptyStream
		    		, hardDelete: true
		    		}

			  connection.deleteStream(stream, deleteOptions, function(err) {
	    		if(err) return done(err)

	    		transaction.commit(function(err, commitResult) {
	    			should.not.be.null(err)
	    			err.message.should.equal('Stream is deleted.')
	    			done()
		    	})
	    	})
		  })
    })
  })

  it('idempotency_is_correct_for_explicit_transactions_with_expected_version_any', function(done) {
    var stream = 'idempotency_is_correct_for_explicit_transactions_with_expected_version_any'
    	, transactionOptions = {
    			expectedVersion: client.expectedVersion.any
	    	}
	    , evt = client.createEventData(uuid.v4(), 'SomethingHappened', true, { Value: 42}, null)

    connection.startTransaction(stream, transactionOptions, function(err, transaction1) {
    	if(err) return done(err)

    	transaction1.write(evt, function(err) {
    		if(err) return done(err)

    		transaction1.commit(function(err, commitResult1) {
    			if(err) return done(err)

    			commitResult1.NextExpectedVersion.should.equal(0)

			    connection.startTransaction(stream, transactionOptions, function(err, transaction2) {
			    	if(err) return done(err)

			    	transaction2.write(evt, function(err) {
			    		if(err) return done(err)

			    		transaction2.commit(function(err, commitResult2) {
				    		if(err) return done(err)

			    			commitResult2.NextExpectedVersion.should.equal(0)
			    			var readOptions = {
					    				start: 0
					    			, count: 100
					    			}

			    			connection.readStreamEventsForward(stream, readOptions, function(err, readResult) {
					    		if(err) return done(err)

					    		readResult.Events.length.should.equal(1)
					    		readResult.Events[0].Event.EventId.should.equal(evt.EventId)
				    			done()
			    			})
				    	})
					  })
				  })
				})
		  })
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
