var client = require('../../../')
    , ges = require('ges-test-helper').memory
    , uuid = require('node-uuid')
    , createTestEvent = require('../../createTestEvent')
    , range = require('../../range')
    , streamWriter = require('../../streamWriter')
    , eventStreamCounter = require('../../eventStreamCounter');

require('../../shouldExtensions');

describe('when_working_with_stream_metadata_as_byte_array', function () {
    var es
        , connection;

    before(function (done) {
        es = ges(function (err, settings) {
            if (err) return done(err);

            connection = client(settings, done);
            es.addConnection(connection)
        })
    });

    it('setting_empty_metadata_works', function (done) {
        var stream = 'setting_empty_metadata_works'
            , setData = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: null
            };

        connection.setStreamMetadata(stream, setData, function (err) {
            if (err) return done(err);

            connection.getStreamMetadataAsRawBytes(stream, {}, function (err, result) {
                if (err) return done(err);

                result.Stream.should.equal(stream);
                result.IsStreamDeleted.should.be.false;
                result.MetastreamVersion.should.equal(0);
                result.StreamMetadata.should.matchBuffer(new Buffer(0));

                done()
            })
        })
    });

    it('setting_metadata_few_times_returns_last_metadata', function (done) {
        var stream = 'setting_metadata_few_times_returns_last_metadata'
            , setData1 = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: new Buffer(uuid.v4())
            };

        connection.setStreamMetadata(stream, setData1, function (err) {
            if (err) return done(err);

            connection.getStreamMetadataAsRawBytes(stream, {}, function (err, result) {
                if (err) return done(err);

                result.Stream.should.equal(stream);
                result.IsStreamDeleted.should.be.false;
                result.MetastreamVersion.should.equal(0);
                result.StreamMetadata.should.matchBuffer(setData1.metadata);

                var setData2 = {
                    expectedMetastreamVersion: 0
                    , metadata: new Buffer(uuid.v4())
                };

                connection.setStreamMetadata(stream, setData2, function (err) {
                    if (err) return done(err);

                    connection.getStreamMetadataAsRawBytes(stream, {}, function (err, result) {
                        if (err) return done(err);

                        result.Stream.should.equal(stream);
                        result.IsStreamDeleted.should.be.false;
                        result.MetastreamVersion.should.equal(1);
                        result.StreamMetadata.should.matchBuffer(setData2.metadata);

                        done()
                    })
                })
            })
        })
    });

    it('trying_to_set_metadata_with_wrong_expected_version_fails', function (done) {
        var stream = 'trying_to_set_metadata_with_wrong_expected_version_fails'
            , setData = {
                expectedMetastreamVersion: 5
                , metadata: new Buffer(100)
            };

        connection.setStreamMetadata(stream, setData, function (err) {
            err.message.should.endWith('Wrong expected version.');
            done()
        })
    });

    it('setting_metadata_with_expected_version_any_works', function (done) {
        var stream = 'setting_metadata_with_expected_version_any_works'
            , setData1 = {
                expectedMetastreamVersion: client.expectedVersion.any
                , metadata: new Buffer(uuid.v4())
            };

        connection.setStreamMetadata(stream, setData1, function (err) {
            if (err) return done(err);

            connection.getStreamMetadataAsRawBytes(stream, {}, function (err, result) {
                if (err) return done(err);

                result.Stream.should.equal(stream);
                result.IsStreamDeleted.should.be.false;
                result.MetastreamVersion.should.equal(0);
                result.StreamMetadata.should.matchBuffer(setData1.metadata);

                var setData2 = {
                    expectedMetastreamVersion: client.expectedVersion.any
                    , metadata: new Buffer(uuid.v4())
                };

                connection.setStreamMetadata(stream, setData2, function (err) {
                    if (err) return done(err);

                    connection.getStreamMetadataAsRawBytes(stream, {}, function (err, result) {
                        if (err) return done(err);

                        result.Stream.should.equal(stream);
                        result.IsStreamDeleted.should.be.false;
                        result.MetastreamVersion.should.equal(1);
                        result.StreamMetadata.should.matchBuffer(setData2.metadata);

                        done()
                    })
                })
            })
        })
    });

    it('setting_metadata_for_not_existing_stream_works', function (done) {
        var stream = 'setting_metadata_for_not_existing_stream_works'
            , setData = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: new Buffer(uuid.v4())
            };

        connection.setStreamMetadata(stream, setData, function (err) {
            if (err) return done(err);

            connection.getStreamMetadataAsRawBytes(stream, {}, function (err, result) {
                if (err) return done(err);

                result.Stream.should.equal(stream);
                result.IsStreamDeleted.should.be.false;
                result.MetastreamVersion.should.equal(0);
                result.StreamMetadata.should.matchBuffer(setData.metadata);

                done()
            })
        })
    });

    it('setting_metadata_for_existing_stream_works', function (done) {
        var stream = 'setting_metadata_for_existing_stream_works'
            , appendData = {
                expectedVersion: client.expectedVersion.noStream
                , events: [createTestEvent(), createTestEvent()]
            };

        connection.appendToStream(stream, appendData, function (err, appendResult) {
            if (err) return done(err);

            var setData = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: new Buffer(uuid.v4())
            };

            connection.setStreamMetadata(stream, setData, function (err) {
                if (err) return done(err);

                connection.getStreamMetadataAsRawBytes(stream, {}, function (err, result) {
                    if (err) return done(err);

                    result.Stream.should.equal(stream);
                    result.IsStreamDeleted.should.be.false;
                    result.MetastreamVersion.should.equal(0);
                    result.StreamMetadata.should.matchBuffer(setData.metadata);

                    done()
                })
            })
        })
    });

    it('setting_metadata_for_deleted_stream_throws_stream_deleted_exception');
    //var stream = 'setting_metadata_for_deleted_stream_throws_stream_deleted_exception'

    it('getting_metadata_for_nonexisting_stream_returns_empty_byte_array', function (done) {
        var stream = 'getting_metadata_for_nonexisting_stream_returns_empty_byte_array';

        connection.getStreamMetadataAsRawBytes(stream, {}, function (err, result) {
            if (err) return done(err);

            result.Stream.should.equal(stream);
            result.IsStreamDeleted.should.be.false;
            result.MetastreamVersion.should.equal(-1);
            result.StreamMetadata.should.matchBuffer(new Buffer(0));

            done()
        })
    });

    it('getting_metadata_for_deleted_stream_returns_empty_byte_array_and_signals_stream_deletion');
    //var stream = 'getting_metadata_for_deleted_stream_returns_empty_byte_array_and_signals_stream_deletion'

    after(function (done) {
        es.cleanup(done)
    })
});