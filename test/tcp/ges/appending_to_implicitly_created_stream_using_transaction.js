var client = require('../../../')
	, ges = require('ges-test-helper').memory
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('appending_to_implicitly_created_stream_using_transaction', function() {
	var es
		, connection

	before(function(done) {
		es = ges(function(err, settings) {
			if(err) return done(err)

			connection = client(settings, done)
			es.addConnection(connection)
		})
	})

  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0em1_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0em1_idempotent'
	    , allEvents = createTestEvent(range(0, 6))

	  connection.startTransaction(stream, { expectedVersion: -1 }, function(err, transaction) {
	  	if(err) return done(err)

		  transaction.write(allEvents, function(err, writeResult) {
		  	if(err) return done(err)

			  transaction.commit(function(err, commitResult) {
			  	if(err) return done(err)

			  	commitResult.NextExpectedVersion.should.equal(5)

				  connection.startTransaction(stream, { expectedVersion: -1 }, function(err, transaction) {
				  	if(err) return done(err)

					  transaction.write(allEvents[0], function(err, writeResult) {
					  	if(err) return done(err)

						  transaction.commit(function(err, commitResult) {
						  	if(err) return done(err)

						  	commitResult.NextExpectedVersion.should.equal(0)

						 		eventStreamCounter(connection, stream, function(err, count) {
							  	if(err) return done(err)

							  	count.should.equal(allEvents.length)
							  	done()
						 		})
						  })
					  })
				  })
			  })
		  })
	  })
  })

  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0any_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0any_idempotent'
	    , allEvents = createTestEvent(range(0, 6))

	  connection.startTransaction(stream, { expectedVersion: -1 }, function(err, transaction) {
	  	if(err) return done(err)

		  transaction.write(allEvents, function(err, writeResult) {
		  	if(err) return done(err)

			  transaction.commit(function(err, commitResult) {
			  	if(err) return done(err)

			  	commitResult.NextExpectedVersion.should.equal(5)

				  connection.startTransaction(stream, { expectedVersion: client.expectedVersion.any }, function(err, transaction) {
				  	if(err) return done(err)

					  transaction.write(allEvents[0], function(err, writeResult) {
					  	if(err) return done(err)

						  transaction.commit(function(err, commitResult) {
						  	if(err) return done(err)

						  	commitResult.NextExpectedVersion.should.equal(0)

						 		eventStreamCounter(connection, stream, function(err, count) {
							  	if(err) return done(err)

							  	count.should.equal(allEvents.length)
							  	done()
						 		})
						  })
					  })
				  })
			  })
		  })
	  })
  })

  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e5_non_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e5_non_idempotent'
	    , allEvents = createTestEvent(range(0, 6))

	  connection.startTransaction(stream, { expectedVersion: -1 }, function(err, transaction) {
	  	if(err) return done(err)

		  transaction.write(allEvents, function(err, writeResult) {
		  	if(err) return done(err)

			  transaction.commit(function(err, commitResult) {
			  	if(err) return done(err)

			  	commitResult.NextExpectedVersion.should.equal(5)

				  connection.startTransaction(stream, { expectedVersion: 5 }, function(err, transaction) {
				  	if(err) return done(err)

					  transaction.write(allEvents[0], function(err, writeResult) {
					  	if(err) return done(err)

						  transaction.commit(function(err, commitResult) {
						  	if(err) return done(err)

						  	commitResult.NextExpectedVersion.should.equal(6)

						 		eventStreamCounter(connection, stream, function(err, count) {
							  	if(err) return done(err)

							  	count.should.equal(allEvents.length + 1)
							  	done()
						 		})
						  })
					  })
				  })
			  })
		  })
	  })
  })

  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e6_wev', function(done) {
    var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e6_wev'
	    , allEvents = createTestEvent(range(0, 6))

	  connection.startTransaction(stream, { expectedVersion: -1 }, function(err, transaction) {
	  	if(err) return done(err)

		  transaction.write(allEvents, function(err, writeResult) {
		  	if(err) return done(err)

			  transaction.commit(function(err, commitResult) {
			  	if(err) return done(err)

			  	commitResult.NextExpectedVersion.should.equal(5)

				  connection.startTransaction(stream, { expectedVersion: 6 }, function(err, transaction) {
				  	if(err) return done(err)

					  transaction.write(allEvents[0], function(err, writeResult) {
					  	if(err) return done(err)

						  transaction.commit(function(err, commitResult) {
								err.should.be.wrongExpectedVersion()
						  	done()
						  })
					  })
				  })
			  })
		  })
	  })
  })

  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e4_wev', function(done) {
    var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e4_wev'
	    , allEvents = createTestEvent(range(0, 6))

	  connection.startTransaction(stream, { expectedVersion: -1 }, function(err, transaction) {
	  	if(err) return done(err)

		  transaction.write(allEvents, function(err, writeResult) {
		  	if(err) return done(err)

			  transaction.commit(function(err, commitResult) {
			  	if(err) return done(err)

			  	commitResult.NextExpectedVersion.should.equal(5)

				  connection.startTransaction(stream, { expectedVersion: 4 }, function(err, transaction) {
				  	if(err) return done(err)

					  transaction.write(allEvents[0], function(err, writeResult) {
					  	if(err) return done(err)

						  transaction.commit(function(err, commitResult) {
								err.should.be.wrongExpectedVersion()
						  	done()
						  })
					  })
				  })
			  })
		  })
	  })
  })

  it('sequence_0em1_0e0_non_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_0e0_non_idempotent'
	    , allEvents = createTestEvent(range(0, 1))

	  connection.startTransaction(stream, { expectedVersion: -1 }, function(err, transaction) {
	  	if(err) return done(err)

		  transaction.write(allEvents, function(err, writeResult) {
		  	if(err) return done(err)

			  transaction.commit(function(err, commitResult) {
			  	if(err) return done(err)

			  	commitResult.NextExpectedVersion.should.equal(0)

				  connection.startTransaction(stream, { expectedVersion: 0 }, function(err, transaction) {
				  	if(err) return done(err)

					  transaction.write(allEvents[0], function(err, writeResult) {
					  	if(err) return done(err)

						  transaction.commit(function(err, commitResult) {
						  	if(err) return done(err)

						  	commitResult.NextExpectedVersion.should.equal(1)
						  	eventStreamCounter(connection, stream, function(err, count) {
							  	if(err) return done(err)

							  	count.should.equal(allEvents.length + 1)
							  	done()
						  	})
						  })
					  })
				  })
			  })
		  })
	  })
  })

  it('sequence_0em1_0any_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_0any_idempotent'
	    , allEvents = createTestEvent(range(0, 1))

	  connection.startTransaction(stream, { expectedVersion: -1 }, function(err, transaction) {
	  	if(err) return done(err)

		  transaction.write(allEvents, function(err, writeResult) {
		  	if(err) return done(err)

			  transaction.commit(function(err, commitResult) {
			  	if(err) return done(err)

			  	commitResult.NextExpectedVersion.should.equal(0)

				  connection.startTransaction(stream, { expectedVersion: client.expectedVersion.any }, function(err, transaction) {
				  	if(err) return done(err)

					  transaction.write(allEvents[0], function(err, writeResult) {
					  	if(err) return done(err)

						  transaction.commit(function(err, commitResult) {
						  	if(err) return done(err)

						  	commitResult.NextExpectedVersion.should.equal(0)
						  	eventStreamCounter(connection, stream, function(err, count) {
							  	if(err) return done(err)

							  	count.should.equal(1)
							  	done()
						  	})
						  })
					  })
				  })
			  })
		  })
	  })
  })

  it('sequence_0em1_0em1_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_0em1_idempotent'
	    , allEvents = createTestEvent(range(0, 1))

	  connection.startTransaction(stream, { expectedVersion: -1 }, function(err, transaction) {
	  	if(err) return done(err)

		  transaction.write(allEvents, function(err, writeResult) {
		  	if(err) return done(err)

			  transaction.commit(function(err, commitResult) {
			  	if(err) return done(err)

			  	commitResult.NextExpectedVersion.should.equal(0)

				  connection.startTransaction(stream, { expectedVersion: -1 }, function(err, transaction) {
				  	if(err) return done(err)

					  transaction.write(allEvents[0], function(err, writeResult) {
					  	if(err) return done(err)

						  transaction.commit(function(err, commitResult) {
						  	if(err) return done(err)

						  	commitResult.NextExpectedVersion.should.equal(0)
						  	eventStreamCounter(connection, stream, function(err, count) {
							  	if(err) return done(err)

							  	count.should.equal(1)
							  	done()
						  	})
						  })
					  })
				  })
			  })
		  })
	  })
  })

  it('sequence_0em1_1e0_2e1_1any_1any_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_1e0_2e1_1any_1any_idempotent'
	    , allEvents = createTestEvent(range(0, 3))

	  connection.startTransaction(stream, { expectedVersion: -1 }, function(err, transaction) {
	  	if(err) return done(err)

		  transaction.write(allEvents, function(err, writeResult) {
		  	if(err) return done(err)

			  transaction.commit(function(err, commitResult) {
			  	if(err) return done(err)

			  	commitResult.NextExpectedVersion.should.equal(2)

				  connection.startTransaction(stream, { expectedVersion: client.expectedVersion.any }, function(err, transaction) {
				  	if(err) return done(err)

					  transaction.write(allEvents[1], function(err, writeResult) {
					  	if(err) return done(err)

						  transaction.write(allEvents[1], function(err, writeResult) {
						  	if(err) return done(err)

							  transaction.commit(function(err, commitResult) {
							  	if(err) return done(err)

							  	commitResult.NextExpectedVersion.should.equal(1)
							  	eventStreamCounter(connection, stream, function(err, count) {
								  	if(err) return done(err)

								  	count.should.equal(allEvents.length)
								  	done()
							  	})
							  })
						  })
						})
				  })
			  })
		  })
	  })
  })

  it('sequence_S_0em1_1em1_E_S_0em1_1em1_2em1_E_idempotancy_fail', function(done) {
    var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_S_0em1_1em1_E_S_0em1_1em1_2em1_E_idempotancy_fail'
	    , allEvents = createTestEvent(range(0, 2))

	  connection.startTransaction(stream, { expectedVersion: -1 }, function(err, transaction) {
	  	if(err) return done(err)

		  transaction.write(allEvents, function(err, writeResult) {
		  	if(err) return done(err)

			  transaction.commit(function(err, commitResult) {
			  	if(err) return done(err)

			  	commitResult.NextExpectedVersion.should.equal(1)

				  connection.startTransaction(stream, { expectedVersion: -1 }, function(err, transaction) {
				  	if(err) return done(err)

					  transaction.write(allEvents.concat(createTestEvent()), function(err, writeResult) {
					  	if(err) return done(err)

						  transaction.commit(function(err, commitResult) {
								err.should.be.wrongExpectedVersion()
						  	done()
						  })
					  })
				  })
			  })
		  })
	  })
  })

  after(function(done) {
  	es.cleanup(done)
  })
})