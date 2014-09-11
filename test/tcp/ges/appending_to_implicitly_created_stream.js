var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')

describe('appending_to_implicitly_created_stream', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 4567 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 4567 }, done)
		})
	})

  /*
   * sequence - events written so stream
   * 0em1 - event number 0 written with exp version -1 (minus 1)
   * 1any - event number 1 written with exp version any
   * S_0em1_1em1_E - START bucket, two events in bucket, END bucket
  */

  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0em1_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0em1_idempotent'
	    , allEvents = range(0, 6).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})
	    , writer = streamWriter(connection, stream, client.expectedVersion.noStream)

	  writer.append(allEvents, function(err, tailWriter) {
	  	if(err) return done(err)

	  	tailWriter(allEvents[0], client.expectedVersion.emptyStream, function(err) {
		  	if(err) return done(err)

		  	eventStreamCounter(connection, stream, function(err, count) {
		  		if(err) return done(err)
		  		count.should.equal(allEvents.length)
			  	done()
		  	})
	  	})
	  })
  })

  it('sequence_0em1_1e0_2e1_3e2_4e3_4e4_0any_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_sequence_0em1_1e0_2e1_3e2_4e3_4e4_0any_idempotent'
	    , allEvents = range(0, 6).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})
	    , writer = streamWriter(connection, stream, client.expectedVersion.noStream)

	  writer.append(allEvents, function(err, tailWriter) {
	  	if(err) return done(err)

	  	tailWriter(allEvents[0], client.expectedVersion.any, function(err) {
		  	if(err) return done(err)

		  	eventStreamCounter(connection, stream, function(err, count) {
		  		if(err) return done(err)
		  		count.should.equal(allEvents.length)
			  	done()
		  	})
	  	})
	  })
	})

  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e5_non_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e5_non_idempotent'
	    , allEvents = range(0, 6).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})
	    , writer = streamWriter(connection, stream, client.expectedVersion.noStream)

	  writer.append(allEvents, function(err, tailWriter) {
	  	if(err) return done(err)

	  	tailWriter(allEvents[0], 5, function(err) {
		  	if(err) return done(err)

		  	eventStreamCounter(connection, stream, function(err, count) {
		  		if(err) return done(err)
		  		count.should.equal(allEvents.length + 1)
			  	done()
		  	})
	  	})
	  })
	})

  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e6_wev', function(done) {
    var stream = 'appending_to_implicitly_created_stream_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e6_wev'
	    , allEvents = range(0, 6).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})
	    , writer = streamWriter(connection, stream, client.expectedVersion.noStream)

	  writer.append(allEvents, function(err, tailWriter) {
	  	if(err) return done(err)

	  	tailWriter(allEvents[0], 6, function(err) {
	  		err.message.should.equal('Wrong expected version.')
	  		done()
	  	})
	  })
	})

  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e4_wev', function(done) {
  	var stream = 'appending_to_implicitly_created_stream_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e4_wev'
	    , allEvents = range(0, 6).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})
	    , writer = streamWriter(connection, stream, client.expectedVersion.noStream)

	  writer.append(allEvents, function(err, tailWriter) {
	  	if(err) return done(err)

	  	tailWriter(allEvents[0], 4, function(err) {
	  		err.message.should.equal('Wrong expected version.')
	  		done()
	  	})
	  })
	})
  
  it('sequence_0em1_0e0_non_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_sequence_0em1_0e0_non_idempotent'
	    , allEvents = range(0, 1).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})
	    , writer = streamWriter(connection, stream, client.expectedVersion.noStream)

	  writer.append(allEvents, function(err, tailWriter) {
	  	if(err) return done(err)

	  	tailWriter(allEvents[0], 0, function(err) {
		  	if(err) return done(err)

	  		eventStreamCounter(connection, stream, function(err, count) {
		  		if(err) return done(err)
		  		count.should.equal(allEvents.length + 1)
			  	done()
		  	})
	  	})
	  })
	})

  it('sequence_0em1_0any_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_sequence_0em1_0any_idempotent'
	    , allEvents = range(0, 1).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})
	    , writer = streamWriter(connection, stream, client.expectedVersion.noStream)

	  writer.append(allEvents, function(err, tailWriter) {
	  	if(err) return done(err)

	  	tailWriter(allEvents[0], client.expectedVersion.any, function(err) {
		  	if(err) return done(err)
	  		
	  		eventStreamCounter(connection, stream, function(err, count) {
		  		if(err) return done(err)
		  		count.should.equal(allEvents.length)
			  	done()
		  	})
	  	})
	  })
	})

  it('sequence_0em1_0em1_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_sequence_0em1_0em1_idempotent'
	    , allEvents = range(0, 1).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})
	    , writer = streamWriter(connection, stream, client.expectedVersion.noStream)

	  writer.append(allEvents, function(err, tailWriter) {
	  	if(err) return done(err)

	  	tailWriter(allEvents[0], client.expectedVersion.emptyStream, function(err) {
		  	if(err) return done(err)
	  		
	  		eventStreamCounter(connection, stream, function(err, count) {
		  		if(err) return done(err)
		  		count.should.equal(allEvents.length)
			  	done()
		  	})
	  	})
	  })
	})

  it('sequence_0em1_1e0_2e1_1any_1any_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_sequence_0em1_1e0_2e1_1any_1any_idempotent'
	    , allEvents = range(0, 3).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})
	    , writer = streamWriter(connection, stream, client.expectedVersion.noStream)

	  writer.append(allEvents, function(err, tailWriter) {
	  	if(err) return done(err)

	  	tailWriter(allEvents[1], client.expectedVersion.any, function(err, tailWriter2) {
		  	if(err) return done(err)
	  		
		  	tailWriter2(allEvents[1], client.expectedVersion.any, function(err) {
			  	if(err) return done(err)
		  		
		  		eventStreamCounter(connection, stream, function(err, count) {
			  		if(err) return done(err)
			  		count.should.equal(allEvents.length)
				  	done()
			  	})
		  	})
			})
	  })
	})

  it('sequence_S_0em1_1em1_E_S_0em1_E_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_sequence_S_0em1_1em1_E_S_0em1_E_idempotent'
	    , allEvents = range(0, 2).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})

	  connection.appendToStream(stream, client.expectedVersion.noStream, allEvents, function(err, appendResult) {
  		if(err) return done(err)

		  connection.appendToStream(stream, client.expectedVersion.noStream, allEvents[0], function(err, appendResult) {
	  		if(err) return done(err)

	  		eventStreamCounter(connection, stream, function(err, count) {
		  		if(err) return done(err)
		  		count.should.equal(allEvents.length)
			  	done()
		  	})
		  })
	  })
	})

  it('sequence_S_0em1_1em1_E_S_0any_E_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_sequence_S_0em1_1em1_E_S_0any_E_idempotent'
	    , allEvents = range(0, 2).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})

	  connection.appendToStream(stream, client.expectedVersion.noStream, allEvents, function(err, appendResult) {
  		if(err) return done(err)

		  connection.appendToStream(stream, client.expectedVersion.any, allEvents[0], function(err, appendResult) {
	  		if(err) return done(err)

	  		eventStreamCounter(connection, stream, function(err, count) {
		  		if(err) return done(err)
		  		count.should.equal(allEvents.length)
			  	done()
		  	})
		  })
	  })
	})

  it('sequence_S_0em1_1em1_E_S_1e0_E_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_sequence_S_0em1_1em1_E_S_1e0_E_idempotent'
    	    , allEvents = range(0, 2).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})

	  connection.appendToStream(stream, client.expectedVersion.noStream, allEvents, function(err, appendResult) {
  		if(err) return done(err)

		  connection.appendToStream(stream, 0, allEvents[1], function(err, appendResult) {
	  		if(err) return done(err)

	  		eventStreamCounter(connection, stream, function(err, count) {
		  		if(err) return done(err)
		  		count.should.equal(allEvents.length)
			  	done()
		  	})
		  })
	  })
	})

  it('sequence_S_0em1_1em1_E_S_1any_E_idempotent', function(done) {
    var stream = 'appending_to_implicitly_created_stream_sequence_S_0em1_1em1_E_S_1any_E_idempotent'
	    , allEvents = range(0, 2).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})

	  connection.appendToStream(stream, client.expectedVersion.noStream, allEvents, function(err, appendResult) {
  		if(err) return done(err)

		  connection.appendToStream(stream, client.expectedVersion.any, allEvents[1], function(err, appendResult) {
	  		if(err) return done(err)

	  		eventStreamCounter(connection, stream, function(err, count) {
		  		if(err) return done(err)
		  		count.should.equal(allEvents.length)
			  	done()
		  	})
		  })
	  })
	})

  it('sequence_S_0em1_1em1_E_S_0em1_1em1_2em1_E_idempotancy_fail', function(done) {
    var stream = 'appending_to_implicitly_created_stream_sequence_S_0em1_1em1_E_S_0em1_1em1_2em1_E_idempotancy_fail'
	    , allEvents = range(0, 2).map(function(i) {
	    		return createTestEvent(uuid.v4())
	    	})

	  connection.appendToStream(stream, client.expectedVersion.noStream, allEvents, function(err, appendResult) {
  		if(err) return done(err)
			var additionalEvents = allEvents.concat([ createTestEvent(uuid.v4()) ])
		  connection.appendToStream(stream, client.expectedVersion.noStream, additionalEvents, function(err, appendResult) {
	  		err.message.should.equal('Wrong expected version.')
	  		done()
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
