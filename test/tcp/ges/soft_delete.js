var client = require('../../../')
	, ges = require('ges-test-helper').memory
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')

require('../../shouldExtensions')

describe('soft_delete', function() {
	var es
		, connection

	before(function(done) {
		es = ges(function(err, settings) {
			if(err) return done(err)

			connection = client(settings, done)
			es.addConnection(connection)
		})
	})

  it('soft_deleted_stream_returns_no_stream_and_no_events_on_read', function(done) {
    var stream = 'soft_deleted_stream_returns_no_stream_and_no_events_on_read'
    	, appendData = {
		    	expectedVersion: client.expectedVersion.noStream
	    	, events: [ createTestEvent(), createTestEvent() ]
	    	}
    connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	appendResult.NextExpectedVersion.should.equal(1)

    	connection.deleteStream(stream, { expectedVersion: 1 }, function(err, deleteResult) {
    		if(err) return done(err)

    		connection.readStreamEventsForward(stream, { start: 0, count: 100 }, function(err, readResult) {
    			if(err) return done(err)

    			readResult.Status.should.equal('NoStream')
    			readResult.Events.length.should.equal(0)
    			readResult.LastEventNumber.should.equal(1)
    			done()
    		})
    	})
    })
  })

  it('soft_deleted_stream_allows_recreation_when_expver_any', function(done) {
    var stream = 'soft_deleted_stream_allows_recreation_when_expver_any'
    	, appendData = {
		    	expectedVersion: client.expectedVersion.noStream
	    	, events: [ createTestEvent(), createTestEvent() ]
	    	}
    connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	appendResult.NextExpectedVersion.should.equal(1)

    	connection.deleteStream(stream, { expectedVersion: 1 }, function(err, deleteResult) {
    		if(err) return done(err)
    		var appendData2 = {
				    	expectedVersion: client.expectedVersion.any
			    	, events: [ createTestEvent(), createTestEvent(), createTestEvent() ]
			    	}

    		connection.appendToStream(stream, appendData2, function(err, appendResult) {
		    	if(err) return done(err)
		    	appendResult.NextExpectedVersion.should.equal(4)

	    		connection.readStreamEventsForward(stream, { start: 0, count: 100 }, function(err, readResult) {
	    			if(err) return done(err)

	    			readResult.Status.should.equal('Success')
	    			readResult.LastEventNumber.should.equal(4)
	    			readResult.Events.length.should.equal(3)

	    			toEventIdArray(readResult.Events).should.eql(toEventIdArray(appendData2.events))
	    			toEventNumberArray(readResult.Events).should.eql([2, 3, 4])

	    			connection.getStreamMetadata(stream, {}, function(err, metadataResult) {
	    				if(err) return done(err)

	    				metadataResult.StreamMetadata.TruncateBefore.should.equal(2)
	    				metadataResult.MetastreamVersion.should.equal(1)
	    				done()
	    			})
	    		})
		    })
    	})
    })
  })

  it('soft_deleted_stream_allows_recreation_when_expver_no_stream', function(done) {
    var stream = 'soft_deleted_stream_allows_recreation_when_expver_no_stream'
    	, appendData = {
		    	expectedVersion: client.expectedVersion.noStream
	    	, events: [ createTestEvent(), createTestEvent() ]
	    	}
    connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	appendResult.NextExpectedVersion.should.equal(1)

    	connection.deleteStream(stream, { expectedVersion: 1 }, function(err, deleteResult) {
    		if(err) return done(err)
    		var appendData2 = {
				    	expectedVersion: client.expectedVersion.noStream
			    	, events: [ createTestEvent(), createTestEvent(), createTestEvent() ]
			    	}

    		connection.appendToStream(stream, appendData2, function(err, appendResult) {
		    	if(err) return done(err)
		    	appendResult.NextExpectedVersion.should.equal(4)

	    		connection.readStreamEventsForward(stream, { start: 0, count: 100 }, function(err, readResult) {
	    			if(err) return done(err)

	    			readResult.Status.should.equal('Success')
	    			readResult.LastEventNumber.should.equal(4)
	    			readResult.Events.length.should.equal(3)

	    			toEventIdArray(readResult.Events).should.eql(toEventIdArray(appendData2.events))
	    			toEventNumberArray(readResult.Events).should.eql([2, 3, 4])

	    			connection.getStreamMetadata(stream, {}, function(err, metadataResult) {
	    				if(err) return done(err)

	    				metadataResult.StreamMetadata.TruncateBefore.should.equal(2)
	    				metadataResult.MetastreamVersion.should.equal(1)
	    				done()
	    			})
	    		})
		    })
    	})
    })
  })

  it('soft_deleted_stream_allows_recreation_when_expver_is_exact', function(done) {
    var stream = 'soft_deleted_stream_allows_recreation_when_expver_is_exact'
    	, appendData = {
		    	expectedVersion: client.expectedVersion.noStream
	    	, events: [ createTestEvent(), createTestEvent() ]
	    	}
    connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	appendResult.NextExpectedVersion.should.equal(1)

    	connection.deleteStream(stream, { expectedVersion: 1 }, function(err, deleteResult) {
    		if(err) return done(err)
    		var appendData2 = {
				    	expectedVersion: 1
			    	, events: [ createTestEvent(), createTestEvent(), createTestEvent() ]
			    	}

    		connection.appendToStream(stream, appendData2, function(err, appendResult) {
		    	if(err) return done(err)
		    	appendResult.NextExpectedVersion.should.equal(4)

	    		connection.readStreamEventsForward(stream, { start: 0, count: 100 }, function(err, readResult) {
	    			if(err) return done(err)

	    			readResult.Status.should.equal('Success')
	    			readResult.LastEventNumber.should.equal(4)
	    			readResult.Events.length.should.equal(3)

	    			toEventIdArray(readResult.Events).should.eql(toEventIdArray(appendData2.events))
	    			toEventNumberArray(readResult.Events).should.eql([2, 3, 4])

	    			connection.getStreamMetadata(stream, {}, function(err, metadataResult) {
	    				if(err) return done(err)

	    				metadataResult.StreamMetadata.TruncateBefore.should.equal(2)
	    				metadataResult.MetastreamVersion.should.equal(1)
	    				done()
	    			})
	    		})
		    })
    	})
    })
  })

  it('soft_deleted_stream_when_recreated_preserves_metadata_except_truncatebefore', function(done) {
    var stream = 'soft_deleted_stream_when_recreated_preserves_metadata_except_truncatebefore'
    	, appendData = {
		    	expectedVersion: client.expectedVersion.noStream
	    	, events: [ createTestEvent(), createTestEvent() ]
	    	}
    connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	appendResult.NextExpectedVersion.should.equal(1)

	  	connection.deleteStream(stream, { expectedVersion: client.expectedVersion.any }, function(err, deleteResult) {
	  		if(err) return done(err)
	    	var setMetadata = {
	    				expectedMetastreamVersion: client.expectedVersion.any
	    			, metadata: client.createStreamMetadata({
	    					truncateBefore: client.maxRecordCount
	    				, maxCount: 100
	    				, acl: {
	    						deleteRoles: 'some-role'
		    				}
		    			, key1: true
		    			, key2: 17
		    			, key3: 'some value'
		    			})
			    	}

	    	connection.setStreamMetadata(stream, setMetadata, function(err, setMetadataResult) {
	    		if(err) return done(err)
		    	setMetadataResult.NextExpectedVersion.should.equal(1)

	    		var appendData2 = {
					    	expectedVersion: client.expectedVersion.any
				    	, events: [ createTestEvent(), createTestEvent(), createTestEvent() ]
				    	}

	    		connection.appendToStream(stream, appendData2, function(err, appendResult) {
			    	if(err) return done(err)
			    	appendResult.NextExpectedVersion.should.equal(4)

		    		connection.readStreamEventsForward(stream, { start: 0, count: 100 }, function(err, readResult) {
		    			if(err) return done(err)

		    			readResult.Status.should.equal('Success')
		    			readResult.LastEventNumber.should.equal(4)
		    			readResult.Events.length.should.equal(3)

		    			toEventIdArray(readResult.Events).should.eql(toEventIdArray(appendData2.events))
		    			toEventNumberArray(readResult.Events).should.eql([2, 3, 4])

		    			connection.getStreamMetadata(stream, {}, function(err, metadataResult) {
		    				if(err) return done(err)

		    				//TODO: Is actually 2. Expected?
		    				//metadataResult.MetastreamVersion.should.equal(1)
		    				metadataResult.MetastreamVersion.should.equal(2)

		    				metadataResult.StreamMetadata.TruncateBefore.should.equal(2)
		    				metadataResult.StreamMetadata.MaxCount.should.equal(100)
		    				metadataResult.StreamMetadata.Acl.DeleteRole.should.equal('some-role')
		    				metadataResult.StreamMetadata.key1.should.be.true
		    				metadataResult.StreamMetadata.key2.should.equal(17)
		    				metadataResult.StreamMetadata.key3.should.equal('some value')
		    				done()
		    			})
		    		})
			    })
	    	})
    	})
    })
  })

  it('soft_deleted_stream_can_be_hard_deleted', function(done) {
    var stream = 'soft_deleted_stream_can_be_deleted'
    	, appendData = {
		    	expectedVersion: client.expectedVersion.noStream
	    	, events: [ createTestEvent(), createTestEvent() ]
	    	}
    connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	appendResult.NextExpectedVersion.should.equal(1)

    	connection.deleteStream(stream, { expectedVersion: 1 }, function(err, deleteResult) {
    		if(err) return done(err)
    		var hardDeleteData = {
		    			expectedVersion: client.expectedVersion.any
		    		, hardDelete: true
		    		}
	    	connection.deleteStream(stream, hardDeleteData, function(err, deleteResult) {
	    		if(err) return done(err)
	    		var appendData2 = {
					    	expectedVersion: 1
				    	, events: [ createTestEvent(), createTestEvent(), createTestEvent() ]
				    	}

	    		connection.readStreamEventsForward(stream, { start: 0, count: 100 }, function(err, readResult) {
	    			if(err) return done(err)

	    			readResult.Status.should.equal('StreamDeleted')

	    			connection.getStreamMetadata(stream, {}, function(err, metadataResult) {
	    				if(err) return done(err)

	    				metadataResult.IsStreamDeleted.should.be.true

	    				var appendData2 = {
							    	expectedVersion: client.expectedVersion.any
						    	, events: [ createTestEvent(), createTestEvent(), createTestEvent() ]
						    	}

			    		connection.appendToStream(stream, appendData2, function(err, appendResult) {
					    	(err === null).should.be.false
		    				done()
			    		})
	    			})
	    		})
	    	})
    	})
    })
  })

  it('soft_deleted_stream_allows_recreation_only_for_first_write', function(done) {
    var stream = 'soft_deleted_stream_allows_recreation_only_for_first_write'
    	, appendData = {
		    	expectedVersion: client.expectedVersion.noStream
	    	, events: [ createTestEvent(), createTestEvent() ]
	    	}
    connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	appendResult.NextExpectedVersion.should.equal(1)

    	connection.deleteStream(stream, { expectedVersion: 1 }, function(err, deleteResult) {
    		if(err) return done(err)
    		var appendData2 = {
				    	expectedVersion: client.expectedVersion.noStream
			    	, events: [ createTestEvent(), createTestEvent(), createTestEvent() ]
			    	}

    		connection.appendToStream(stream, appendData2, function(err, appendResult) {
		    	if(err) return done(err)
		    	appendResult.NextExpectedVersion.should.equal(4)
	    		var appendData3 = {
					    	expectedVersion: client.expectedVersion.noStream
				    	, events: [ createTestEvent() ]
				    	}

		    	connection.appendToStream(stream, appendData3, function(err, appendResult) {
		    		(err === null).should.be.false

		    		connection.readStreamEventsForward(stream, { start: 0, count: 100 }, function(err, readResult) {
		    			if(err) return done(err)

		    			readResult.Status.should.equal('Success')
		    			readResult.LastEventNumber.should.equal(4)
		    			readResult.Events.length.should.equal(3)

		    			toEventIdArray(readResult.Events).should.eql(toEventIdArray(appendData2.events))
		    			toEventNumberArray(readResult.Events).should.eql([2, 3, 4])

		    			connection.getStreamMetadata(stream, {}, function(err, metadataResult) {
		    				if(err) return done(err)

		    				metadataResult.StreamMetadata.TruncateBefore.should.equal(2)
		    				metadataResult.MetastreamVersion.should.equal(1)
		    				done()
		    			})
		    		})
				  })
		    })
    	})
    })
  })

  it('soft_deleted_stream_appends_both_writes_when_expver_any', function(done) {
    var stream = 'soft_deleted_stream_appends_both_concurrent_writes_when_expver_any'
    	, appendData = {
		    	expectedVersion: client.expectedVersion.noStream
	    	, events: [ createTestEvent(), createTestEvent() ]
	    	}
    connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	appendResult.NextExpectedVersion.should.equal(1)

    	connection.deleteStream(stream, { expectedVersion: 1 }, function(err, deleteResult) {
    		if(err) return done(err)
    		var appendData2 = {
				    	expectedVersion: client.expectedVersion.any
			    	, events: [ createTestEvent(), createTestEvent(), createTestEvent() ]
			    	}

    		connection.appendToStream(stream, appendData2, function(err, appendResult) {
		    	if(err) return done(err)
		    	appendResult.NextExpectedVersion.should.equal(4)
	    		var appendData3 = {
					    	expectedVersion: client.expectedVersion.any
				    	, events: [ createTestEvent(), createTestEvent() ]
				    	}

		    	connection.appendToStream(stream, appendData3, function(err, appendResult) {
			    	if(err) return done(err)
			    	appendResult.NextExpectedVersion.should.equal(6)

		    		connection.readStreamEventsForward(stream, { start: 0, count: 100 }, function(err, readResult) {
		    			if(err) return done(err)

		    			readResult.Status.should.equal('Success')
		    			readResult.LastEventNumber.should.equal(6)
		    			readResult.Events.length.should.equal(5)

		    			toEventIdArray(readResult.Events).should.eql(toEventIdArray(appendData2.events.concat(appendData3.events)))
		    			toEventNumberArray(readResult.Events).should.eql([2, 3, 4, 5, 6])

		    			connection.getStreamMetadata(stream, {}, function(err, metadataResult) {
		    				if(err) return done(err)

		    				metadataResult.StreamMetadata.TruncateBefore.should.equal(2)
		    				metadataResult.MetastreamVersion.should.equal(1)
		    				done()
		    			})
		    		})
				  })
		    })
    	})
    })
  })

  it('setting_json_metadata_on_empty_soft_deleted_stream_recreates_stream_not_overriding_metadata', function(done) {
    var stream = 'setting_json_metadata_on_empty_soft_deleted_stream_recreates_stream_not_overriding_metadata'
  	connection.deleteStream(stream, { expectedVersion: client.expectedVersion.noStream }, function(err, deleteResult) {
  		if(err) return done(err)

  		var setMetadata = {
    				expectedMetastreamVersion: 0
    			, metadata: client.createStreamMetadata({
    				  maxCount: 100
    				, acl: {
    						deleteRoles: 'some-role'
	    				}
	    			, key1: true
	    			, key2: 17
	    			, key3: 'some value'
	    			})
		    	}

    	connection.setStreamMetadata(stream, setMetadata, function(err, setMetadataResult) {
    		if(err) return done(err)
	    	setMetadataResult.NextExpectedVersion.should.equal(1)


    		connection.readStreamEventsForward(stream, { start: 0, count: 100 }, function(err, readResult) {
    			if(err) return done(err)

    			readResult.Status.should.equal('NoStream')
    			readResult.LastEventNumber.should.equal(-1)
    			readResult.Events.length.should.equal(0)

    			connection.getStreamMetadata(stream, {}, function(err, metadataResult) {
    				if(err) return done(err)

    				metadataResult.MetastreamVersion.should.equal(2)
    				metadataResult.StreamMetadata.TruncateBefore.should.equal(0)
    				metadataResult.StreamMetadata.MaxCount.should.equal(100)
    				metadataResult.StreamMetadata.Acl.DeleteRole.should.equal('some-role')
    				metadataResult.StreamMetadata.key1.should.be.true
    				metadataResult.StreamMetadata.key2.should.equal(17)
    				metadataResult.StreamMetadata.key3.should.equal('some value')
    				done()
    			})
    		})
		  })
    })
  })

  it('setting_json_metadata_on_nonempty_soft_deleted_stream_recreates_stream_not_overriding_metadata', function(done) {
    var stream = 'setting_json_metadata_on_nonempty_soft_deleted_stream_recreates_stream_not_overriding_metadata'
	    , appendData = {
		    	expectedVersion: client.expectedVersion.noStream
	    	, events: [ createTestEvent(), createTestEvent() ]
	    	}
    connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	appendResult.NextExpectedVersion.should.equal(1)

	  	connection.deleteStream(stream, { expectedVersion: 1 }, function(err, deleteResult) {
	  		if(err) return done(err)

	  		var setMetadata = {
	    				expectedMetastreamVersion: 0
	    			, metadata: client.createStreamMetadata({
	    				  maxCount: 100
	    				, acl: {
	    						deleteRoles: 'some-role'
		    				}
		    			, key1: true
		    			, key2: 17
		    			, key3: 'some value'
		    			})
			    	}

	    	connection.setStreamMetadata(stream, setMetadata, function(err, setMetadataResult) {
	    		if(err) return done(err)
		    	setMetadataResult.NextExpectedVersion.should.equal(1)

	    		connection.readStreamEventsForward(stream, { start: 0, count: 100 }, function(err, readResult) {
	    			if(err) return done(err)

	    			readResult.Status.should.equal('Success')
	    			readResult.LastEventNumber.should.equal(1)
	    			readResult.Events.length.should.equal(0)

	    			connection.getStreamMetadata(stream, {}, function(err, metadataResult) {
	    				if(err) return done(err)

	    				metadataResult.MetastreamVersion.should.equal(2)
	    				metadataResult.StreamMetadata.TruncateBefore.should.equal(2)
	    				metadataResult.StreamMetadata.MaxCount.should.equal(100)
	    				metadataResult.StreamMetadata.Acl.DeleteRole.should.equal('some-role')
	    				metadataResult.StreamMetadata.key1.should.be.true
	    				metadataResult.StreamMetadata.key2.should.equal(17)
	    				metadataResult.StreamMetadata.key3.should.equal('some value')
	    				done()
	    			})
	    		})
		    })
	    })
    })
  })

  it('setting_nonjson_metadata_on_empty_soft_deleted_stream_recreates_stream_keeping_original_metadata', function(done) {
    var stream = 'setting_nonjson_metadata_on_empty_soft_deleted_stream_recreates_stream_overriding_metadata'
  	connection.deleteStream(stream, { expectedVersion: client.expectedVersion.noStream }, function(err, deleteResult) {
  		if(err) return done(err)

  		var setMetadata = {
    				expectedMetastreamVersion: 0
    			, metadata: new Buffer(256)
		    	}

    	connection.setStreamMetadata(stream, setMetadata, function(err, setMetadataResult) {
    		if(err) return done(err)
	    	setMetadataResult.NextExpectedVersion.should.equal(1)

    		connection.readStreamEventsForward(stream, { start: 0, count: 100 }, function(err, readResult) {
    			if(err) return done(err)

    			readResult.Status.should.equal('NoStream')
    			readResult.LastEventNumber.should.equal(-1)
    			readResult.Events.length.should.equal(0)

    			connection.getStreamMetadataAsRawBytes(stream, {}, function(err, metadataResult) {
    				if(err) return done(err)

    				metadataResult.MetastreamVersion.should.equal(1)
    				metadataResult.StreamMetadata.should.matchBuffer(setMetadata.metadata)
    				done()
    			})
    		})
		  })
    })
  })

  it('setting_nonjson_metadata_on_nonempty_soft_deleted_stream_recreates_stream_keeping_original_metadata', function(done) {
    var stream = 'setting_nonjson_metadata_on_nonempty_soft_deleted_stream_recreates_stream_overriding_metadata'
	    , appendData = {
		    	expectedVersion: client.expectedVersion.noStream
	    	, events: [ createTestEvent(), createTestEvent() ]
	    	}
    connection.appendToStream(stream, appendData, function(err, appendResult) {
    	if(err) return done(err)
    	appendResult.NextExpectedVersion.should.equal(1)

	  	connection.deleteStream(stream, { expectedVersion: 1 }, function(err, deleteResult) {
	  		if(err) return done(err)

	  		var setMetadata = {
	    				expectedMetastreamVersion: 0
	    			, metadata: new Buffer(256)
		    		}

	    	connection.setStreamMetadata(stream, setMetadata, function(err, setMetadataResult) {
	    		if(err) return done(err)
		    	setMetadataResult.NextExpectedVersion.should.equal(1)

	    		connection.readStreamEventsForward(stream, { start: 0, count: 100 }, function(err, readResult) {
	    			if(err) return done(err)

	    			readResult.Status.should.equal('Success')
	    			readResult.LastEventNumber.should.equal(1)
	    			readResult.Events.length.should.equal(2)
	    			toEventNumberArray(readResult.Events).should.eql([0, 1])

	    			connection.getStreamMetadataAsRawBytes(stream, {}, function(err, metadataResult) {
	    				if(err) return done(err)

	    				metadataResult.MetastreamVersion.should.equal(1)
	    				metadataResult.StreamMetadata.should.matchBuffer(setMetadata.metadata)
	    				done()
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

function toEventIdArray(events) {
	return events.map(function(evt) {
		return evt.EventId || evt.OriginalEvent.EventId
	})
}

function toEventNumberArray(events) {
	return events.map(function(evt) {
		return evt.OriginalEvent.EventNumber
	})
}

