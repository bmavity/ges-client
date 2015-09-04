var client = require('../../../')
	, ges = require('ges-test-helper').memory
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')

describe('when_working_with_stream_metadata_as_structured_info', function() {
	var es
		, connection

	before(function(done) {
		es = ges(function(err, settings) {
			if(err) return done(err)

			connection = client(settings, done)
			es.addConnection(connection)
		})
	})

  it('setting_empty_metadata_works', function(done) {
		var stream = 'setting_empty_metadata_works_structured_info'
			, setData = {
					expectedMetastreamVersion: client.expectedVersion.emptyStream
				, metadata: client.createStreamMetadata()
				}

		connection.setStreamMetadata(stream, setData, function(err) {
			if(err) return done(err)

			connection.getStreamMetadataAsRawBytes(stream, {}, function(err, result) {
				if(err) return done(err)

				result.Stream.should.equal(stream)
				result.IsStreamDeleted.should.be.false
				result.MetastreamVersion.should.equal(0)
				result.StreamMetadata.should.matchBuffer(new Buffer('{}'))

				done()
			})
		})
  })

  it('setting_metadata_few_times_returns_last_metadata_info', function(done) {
    var stream = 'setting_metadata_few_times_returns_last_metadata_info'
			, setData1 = {
					expectedMetastreamVersion: client.expectedVersion.emptyStream
				, metadata: client.createStreamMetadata({
						maxCount: 17
					, maxAge: 3735928559 //0xDEADBEEF
					, truncateBefore: 10
					, cacheControl: 180013754 //0xABACABA
					})
				}

		connection.setStreamMetadata(stream, setData1, function(err) {
			if(err) return done(err)

			connection.getStreamMetadata(stream, {}, function(err, result) {
				if(err) return done(err)

				result.Stream.should.equal(stream)
				result.IsStreamDeleted.should.be.false
				result.MetastreamVersion.should.equal(0)
				result.StreamMetadata.MaxCount.should.equal(17)
				result.StreamMetadata.MaxAge.should.equal(3735928559)
				result.StreamMetadata.TruncateBefore.should.equal(10)
				result.StreamMetadata.CacheControl.should.equal(180013754)

				var setData2 = {
							expectedMetastreamVersion: 0
						, metadata: client.createStreamMetadata({
								maxCount: 37
							, maxAge: 3203391149 //0xBEEFDEAD
							, truncateBefore: 24
							, cacheControl: 58714794925 //0xDABACABAD
							})
						}

				connection.setStreamMetadata(stream, setData2, function(err) {
					if(err) return done(err)

					connection.getStreamMetadata(stream, {}, function(err, result) {
						if(err) return done(err)

						result.Stream.should.equal(stream)
						result.IsStreamDeleted.should.be.false
						result.MetastreamVersion.should.equal(1)
						result.StreamMetadata.MaxCount.should.equal(37)
						result.StreamMetadata.MaxAge.should.equal(3203391149)
						result.StreamMetadata.TruncateBefore.should.equal(24)
						result.StreamMetadata.CacheControl.should.equal(58714794925)

						done()
					})
				})
			})
		})
  })

  it('trying_to_set_metadata_with_wrong_expected_version_fails', function(done) {
    var stream = 'trying_to_set_metadata_with_wrong_expected_version_fails'
	    , setData = {
					expectedMetastreamVersion: 2
				, metadata: client.createStreamMetadata()
				}

		connection.setStreamMetadata(stream, setData, function(err) {
			err.message.should.endWith('Wrong expected version.')
			done()
		})
  })

  it('setting_metadata_with_expected_version_any_works', function(done) {
    var stream = 'setting_metadata_with_expected_version_any_works_structured_info'
			, setData1 = {
					expectedMetastreamVersion: client.expectedVersion.any
				, metadata: client.createStreamMetadata({
						maxCount: 17
					, maxAge: 3735928559 //0xDEADBEEF
					, truncateBefore: 10
					, cacheControl: 180013754 //0xABACABA
					})
				}

		connection.setStreamMetadata(stream, setData1, function(err) {
			if(err) return done(err)

			connection.getStreamMetadata(stream, {}, function(err, result) {
				if(err) return done(err)

				result.Stream.should.equal(stream)
				result.IsStreamDeleted.should.be.false
				result.MetastreamVersion.should.equal(0)
				result.StreamMetadata.MaxCount.should.equal(17)
				result.StreamMetadata.MaxAge.should.equal(3735928559)
				result.StreamMetadata.TruncateBefore.should.equal(10)
				result.StreamMetadata.CacheControl.should.equal(180013754)

				var setData2 = {
							expectedMetastreamVersion: client.expectedVersion.any
						, metadata: client.createStreamMetadata({
								maxCount: 37
							, maxAge: 3203391149 //0xBEEFDEAD
							, truncateBefore: 24
							, cacheControl: 58714794925 //0xDABACABAD
							})
						}

				connection.setStreamMetadata(stream, setData2, function(err) {
					if(err) return done(err)

					connection.getStreamMetadata(stream, {}, function(err, result) {
						if(err) return done(err)

						result.Stream.should.equal(stream)
						result.IsStreamDeleted.should.be.false
						result.MetastreamVersion.should.equal(1)
						result.StreamMetadata.MaxCount.should.equal(37)
						result.StreamMetadata.MaxAge.should.equal(3203391149)
						result.StreamMetadata.TruncateBefore.should.equal(24)
						result.StreamMetadata.CacheControl.should.equal(58714794925)

						done()
					})
				})
			})
		})
  })

  it('setting_metadata_for_not_existing_stream_works', function(done) {
    var stream = 'setting_metadata_for_not_existing_stream_works_structured_info'
   		, setData = {
					expectedMetastreamVersion: client.expectedVersion.emptyStream
				, metadata: client.createStreamMetadata({
						maxCount: 17
					, maxAge: 3735928559 //0xDEADBEEF
					, truncateBefore: 10
					, cacheControl: 180013754 //0xABACABA
					})
				}

		connection.setStreamMetadata(stream, setData, function(err) {
			if(err) return done(err)

			connection.getStreamMetadata(stream, {}, function(err, result) {
				if(err) return done(err)

				result.Stream.should.equal(stream)
				result.IsStreamDeleted.should.be.false
				result.MetastreamVersion.should.equal(0)
				result.StreamMetadata.MaxCount.should.equal(17)
				result.StreamMetadata.MaxAge.should.equal(3735928559)
				result.StreamMetadata.TruncateBefore.should.equal(10)
				result.StreamMetadata.CacheControl.should.equal(180013754)

				done()
			})
		})
	})

  it('setting_metadata_for_existing_stream_works', function(done) {
    var stream = 'setting_metadata_for_existing_stream_works_structured_info'
    	, appendData = {
    			expectedVersion: client.expectedVersion.emptyStream
    		, events: createTestEvent()
	    	}

	  connection.appendToStream(stream, appendData, function(err, appendResult) {
	  	if(err) return done(err)

   		var setData = {
						expectedMetastreamVersion: client.expectedVersion.emptyStream
					, metadata: client.createStreamMetadata({
							maxCount: 17
						, maxAge: 3735928559 //0xDEADBEEF
						, truncateBefore: 10
						, cacheControl: 180013754 //0xABACABA
						})
					}

			connection.setStreamMetadata(stream, setData, function(err) {
				if(err) return done(err)

				connection.getStreamMetadata(stream, {}, function(err, result) {
					if(err) return done(err)

					result.Stream.should.equal(stream)
					result.IsStreamDeleted.should.be.false
					result.MetastreamVersion.should.equal(0)
					result.StreamMetadata.MaxCount.should.equal(17)
					result.StreamMetadata.MaxAge.should.equal(3735928559)
					result.StreamMetadata.TruncateBefore.should.equal(10)
					result.StreamMetadata.CacheControl.should.equal(180013754)

					done()
				})
			})
	  })
	})

  it('getting_metadata_for_nonexisting_stream_returns_empty_stream_metadata', function(done) {
    var stream = 'getting_metadata_for_nonexisting_stream_returns_empty_stream_metadata'
		connection.getStreamMetadata(stream, {}, function(err, result) {
			if(err) return done(err)

			result.Stream.should.equal(stream)
			result.IsStreamDeleted.should.be.false
			result.MetastreamVersion.should.equal(-1)
			should.be.null(result.StreamMetadata.MaxCount)
			should.be.null(result.StreamMetadata.MaxAge)
			should.be.null(result.StreamMetadata.TruncateBefore)
			should.be.null(result.StreamMetadata.CacheControl)

			done()
		})
	})

  // Ignored in main project
  it('getting_metadata_for_metastream_returns_correct_metadata')
    //var stream = '$$getting_metadata_for_metastream_returns_correct_metadata'

  it('getting_metadata_for_deleted_stream_returns_empty_stream_metadata_and_signals_stream_deletion', function(done) {
    var stream = 'getting_metadata_for_deleted_stream_returns_empty_stream_metadata_and_signals_stream_deletion'
   		, setData = {
					expectedMetastreamVersion: client.expectedVersion.emptyStream
				, metadata: client.createStreamMetadata({
						maxCount: 17
					, maxAge: 3735928559 //0xDEADBEEF
					, truncateBefore: 10
					, cacheControl: 180013754 //0xABACABA
					})
				}

		connection.setStreamMetadata(stream, setData, function(err) {
			if(err) return done(err)
			var deleteData = {
						expectedVersion: client.expectedVersion.emptyStream
					, hardDelete: true
					}

			connection.deleteStream(stream, deleteData, function(err) {
				if(err) return done(err)

				connection.getStreamMetadata(stream, {}, function(err, result) {
					if(err) return done(err)

					result.Stream.should.equal(stream)
					result.IsStreamDeleted.should.be.true
					result.MetastreamVersion.should.equal(client.eventNumber.deletedStream)
					should.be.null(result.StreamMetadata.MaxCount)
					should.be.null(result.StreamMetadata.MaxAge)
					should.be.null(result.StreamMetadata.TruncateBefore)
					should.be.null(result.StreamMetadata.CacheControl)
					should.be.null(result.StreamMetadata.Acl)

					done()
				})
			})
		})
	})

  it('setting_correctly_formatted_metadata_as_raw_allows_to_read_it_as_structured_metadata', function(done) {
    var stream = 'setting_correctly_formatted_metadata_as_raw_allows_to_read_it_as_structured_metadata'
   		, setData = {
					expectedMetastreamVersion: client.expectedVersion.emptyStream
				, metadata: new Buffer(JSON.stringify({
						$maxCount: 17,
						$maxAge: 123321,
						$tb: 23,
						$cacheControl: 7654321,
						$acl: {
						   $r: 'readRole',
						   $w: 'writeRole',
						   $d: 'deleteRole',
						   $mw: 'metaWriteRole'
						},
						customString: 'a string',
						customInt: -179,
						customDouble: 1.7,
						customLong: 123123123123123123,
						customBool: true,
						customNullable: null,
						customRawJson: {
						   subProperty: 999
						}
          }))
				}

		connection.setStreamMetadata(stream, setData, function(err) {
			if(err) return done(err)

			connection.getStreamMetadata(stream, {}, function(err, result) {
				if(err) return done(err)

				result.Stream.should.equal(stream)
				result.IsStreamDeleted.should.be.false
				result.MetastreamVersion.should.equal(0)
				result.StreamMetadata.MaxCount.should.equal(17)
				result.StreamMetadata.MaxAge.should.equal(123321)
				result.StreamMetadata.TruncateBefore.should.equal(23)
				result.StreamMetadata.CacheControl.should.equal(7654321)

				result.StreamMetadata.Acl.ReadRole.should.equal('readRole')
				result.StreamMetadata.Acl.WriteRole.should.equal('writeRole')
				result.StreamMetadata.Acl.DeleteRole.should.equal('deleteRole')
				result.StreamMetadata.Acl.MetaWriteRole.should.equal('metaWriteRole')

				result.StreamMetadata.customString.should.equal('a string')
				result.StreamMetadata.customInt.should.equal(-179)
				result.StreamMetadata.customDouble.should.equal(1.7)
				result.StreamMetadata.customLong.should.equal(123123123123123123)
				result.StreamMetadata.customBool.should.equal(true)
				;(result.StreamMetadata.customNullable === null).should.be.true
				result.StreamMetadata.customRawJson.should.eql({ subProperty: 999 })

				done()
			})
		})
	})

  it('setting_structured_metadata_with_custom_properties_returns_them_untouched', function(done) {
    var stream = 'setting_structured_metadata_with_custom_properties_returns_them_untouched'
   		, setData = {
					expectedMetastreamVersion: client.expectedVersion.emptyStream
				, metadata: client.createStreamMetadata({
						maxCount: 17,
						maxAge: 123321,
						truncateBefore: 23,
						cacheControl: 7654321,
						acl: {
						   readRoles: 'readRole',
						   writeRoles: 'writeRole',
						   deleteRoles: 'deleteRole',
						   metaWriteRoles: 'metaWriteRole'
						},
						customString: 'a string',
						customInt: -179,
						customDouble: 1.7,
						customLong: 123123123123123123,
						customBool: true,
						customNullable: null,
						customRawJson: {
						   subProperty: 999
						}
          })
				}

		connection.setStreamMetadata(stream, setData, function(err) {
			if(err) return done(err)

			connection.getStreamMetadata(stream, {}, function(err, result) {
				if(err) return done(err)

				result.Stream.should.equal(stream)
				result.IsStreamDeleted.should.be.false
				result.MetastreamVersion.should.equal(0)
				result.StreamMetadata.MaxCount.should.equal(17)
				result.StreamMetadata.MaxAge.should.equal(123321)
				result.StreamMetadata.TruncateBefore.should.equal(23)
				result.StreamMetadata.CacheControl.should.equal(7654321)

				result.StreamMetadata.Acl.ReadRole.should.equal('readRole')
				result.StreamMetadata.Acl.WriteRole.should.equal('writeRole')
				result.StreamMetadata.Acl.DeleteRole.should.equal('deleteRole')
				result.StreamMetadata.Acl.MetaWriteRole.should.equal('metaWriteRole')

				result.StreamMetadata.customString.should.equal('a string')
				result.StreamMetadata.customInt.should.equal(-179)
				result.StreamMetadata.customDouble.should.equal(1.7)
				result.StreamMetadata.customLong.should.equal(123123123123123123)
				result.StreamMetadata.customBool.should.equal(true)
				;(result.StreamMetadata.customNullable === null).should.be.true
				result.StreamMetadata.customRawJson.should.eql({ subProperty: 999 })

				done()
			})
		})
	})

  it('setting_structured_metadata_with_multiple_roles_can_be_read_back', function(done) {
    var stream = 'setting_structured_metadata_with_multiple_roles_can_be_read_back'
   		, setData = {
					expectedMetastreamVersion: client.expectedVersion.emptyStream
				, metadata: client.createStreamMetadata({
						acl: {
							readRoles: ['r1', 'r2', 'r3']
						, writeRoles: ['w1', 'w2']
						, deleteRoles: ['d1', 'd2', 'd3', 'd4']
						, metaWriteRoles: ['mw1', 'mw2']
						}
          })
				}

		connection.setStreamMetadata(stream, setData, function(err) {
			if(err) return done(err)

			connection.getStreamMetadata(stream, {}, function(err, result) {
				if(err) return done(err)

				result.Stream.should.equal(stream)
				result.IsStreamDeleted.should.be.false
				result.MetastreamVersion.should.equal(0)

				result.StreamMetadata.Acl.ReadRoles.should.eql(['r1', 'r2', 'r3'])
				result.StreamMetadata.Acl.WriteRoles.should.eql(['w1', 'w2'])
				result.StreamMetadata.Acl.DeleteRoles.should.eql(['d1', 'd2', 'd3', 'd4'])
				result.StreamMetadata.Acl.MetaWriteRoles.should.eql(['mw1', 'mw2'])

				done()
			})
		})
	})

  it('setting_correct_metadata_with_multiple_roles_in_acl_allows_to_read_it_as_structured_metadata', function(done) {
    var stream = 'setting_correct_metadata_with_multiple_roles_in_acl_allows_to_read_it_as_structured_metadata'
   		, setData = {
					expectedMetastreamVersion: client.expectedVersion.emptyStream
				, metadata: new Buffer(JSON.stringify({
						$acl: {
							$r: ['r1', 'r2', 'r3']
						, $w: ['w1', 'w2']
						, $d: ['d1', 'd2', 'd3', 'd4']
						, $mw: ['mw1', 'mw2']
						}
          }))
				}

		connection.setStreamMetadata(stream, setData, function(err) {
			if(err) return done(err)

			connection.getStreamMetadata(stream, {}, function(err, result) {
				if(err) return done(err)

				result.Stream.should.equal(stream)
				result.IsStreamDeleted.should.be.false
				result.MetastreamVersion.should.equal(0)

				result.StreamMetadata.Acl.ReadRoles.should.eql(['r1', 'r2', 'r3'])
				result.StreamMetadata.Acl.WriteRoles.should.eql(['w1', 'w2'])
				result.StreamMetadata.Acl.DeleteRoles.should.eql(['d1', 'd2', 'd3', 'd4'])
				result.StreamMetadata.Acl.MetaWriteRoles.should.eql(['mw1', 'mw2'])

				done()
			})
		})
	})


  after(function(done) {
  	es.cleanup(done)
  })
})