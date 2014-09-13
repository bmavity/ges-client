var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')

require('../../shouldExtensions')

describe('when_working_with_stream_metadata_as_structured_info', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5004 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5004 }, done)
		})
	})

  it('setting_empty_metadata_works', function(done) {
		var stream = 'setting_empty_metadata_works'
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

/*
						Assert.AreEqual(stream, meta.Stream);
            Assert.AreEqual(false, meta.IsStreamDeleted);
            Assert.AreEqual(0, meta.MetastreamVersion);
            Assert.AreEqual(metadata.MaxCount, meta.StreamMetadata.MaxCount);
            Assert.AreEqual(metadata.MaxAge, meta.StreamMetadata.MaxAge);
            Assert.AreEqual(metadata.TruncateBefore, meta.StreamMetadata.TruncateBefore);
            Assert.AreEqual(metadata.CacheControl, meta.StreamMetadata.CacheControl);
*/
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

  it('trying_to_set_metadata_with_wrong_expected_version_fails')
    //var stream = 'trying_to_set_metadata_with_wrong_expected_version_fails'
  it('setting_metadata_with_expected_version_any_works')
    //var stream = 'setting_metadata_with_expected_version_any_works'
  it('setting_metadata_for_not_existing_stream_works')
    //var stream = 'setting_metadata_for_not_existing_stream_works'
  it('setting_metadata_for_existing_stream_works')
    //var stream = 'setting_metadata_for_existing_stream_works'
  it('getting_metadata_for_nonexisting_stream_returns_empty_stream_metadata')
    //var stream = 'getting_metadata_for_nonexisting_stream_returns_empty_stream_metadata'
  it('getting_metadata_for_metastream_returns_correct_metadata')
    //var stream = '$$getting_metadata_for_metastream_returns_correct_metadata'
  it('getting_metadata_for_deleted_stream_returns_empty_stream_metadata_and_signals_stream_deletion')
    //var stream = 'getting_metadata_for_deleted_stream_returns_empty_stream_metadata_and_signals_stream_deletion'
  it('setting_correctly_formatted_metadata_as_raw_allows_to_read_it_as_structured_metadata')
    //var stream = 'setting_correctly_formatted_metadata_as_raw_allows_to_read_it_as_structured_metadata'
  it('setting_structured_metadata_with_custom_properties_returns_them_untouched')
    //var stream = 'setting_structured_metadata_with_custom_properties_returns_them_untouched'
  it('setting_structured_metadata_with_multiple_roles_can_be_read_back')
    //var stream = 'setting_structured_metadata_with_multiple_roles_can_be_read_back'
  it('setting_correct_metadata_with_multiple_roles_in_acl_allows_to_read_it_as_structured_metadata')
    //var stream = 'setting_correct_metadata_with_multiple_roles_in_acl_allows_to_read_it_as_structured_metadata'


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