var client = require('../../../')
    , ges = require('ges-test-helper').memory
    , uuid = require('node-uuid')
    , createTestEvent = require('../../createTestEvent')
    , range = require('../../range')
    , reverse = require('../../reverse')
    , streamWriter = require('../../streamWriter')
    , eventStreamCounter = require('../../eventStreamCounter')
    , should = require('../../shouldExtensions');


describe('when_having_max_count_set_for_stream', function () {
    var es
        , connection
        , stream = 'max-count-test-stream'
        , testEvents = createTestEvent(range(0, 5));

    beforeEach(function (done) {
        es = ges(function (err, settings) {
            if (err) return done(err);

            connection = client(settings, function (err) {
                if (err) return done(err);

                es.addConnection(connection);

                var setMetadata = {
                    expectedMetastreamVersion: client.expectedVersion.emptyStream
                    , metadata: client.createStreamMetadata({
                        maxCount: 3
                    })
                };

                connection.setStreamMetadata(stream, setMetadata, function (err) {
                    if (err) return done(err);
                    var appendData = {
                        expectedVersion: client.expectedVersion.emptyStream
                        , events: testEvents
                    };

                    connection.appendToStream(stream, appendData, done)
                })
            })
        })
    });

    it('read_stream_forward_respects_max_count', function (done) {
        connection.readStreamEventsForward(stream, {start: 0, count: 100}, function (err, readResult) {
            if (err) return done(err);

            readResult.Status.should.equal('Success');
            readResult.Events.length.should.equal(3);
            readResult.Events.should.matchEventIdsWith(testEvents.slice(2));
            done()
        })
    });

    it('read_stream_backward_respects_max_count', function (done) {
        connection.readStreamEventsBackward(stream, {start: -1, count: 100}, function (err, readResult) {
            if (err) return done(err);

            readResult.Status.should.equal('Success');
            readResult.Events.length.should.equal(3);
            readResult.Events.should.matchEventIdsWith(reverse(testEvents.slice(2)));
            done()
        })
    });

    it('after_setting_less_strict_max_count_read_stream_forward_reads_more_events', function (done) {
        var readData = {
            start: 0
            , count: 100
        };
        connection.readStreamEventsForward(stream, readData, function (err, readResult) {
            if (err) return done(err);

            readResult.Status.should.equal('Success');
            readResult.Events.length.should.equal(3);
            readResult.Events.should.matchEventIdsWith(testEvents.slice(2));

            var setMetadata = {
                expectedMetastreamVersion: 0
                , metadata: client.createStreamMetadata({
                    maxCount: 4
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);

                connection.readStreamEventsForward(stream, readData, function (err, readResult) {
                    readResult.Status.should.equal('Success');
                    readResult.Events.length.should.equal(4);
                    readResult.Events.should.matchEventIdsWith(testEvents.slice(1));
                    done()
                })
            })
        })
    });

    it('after_setting_more_strict_max_count_read_stream_forward_reads_less_events', function (done) {
        var readData = {
            start: 0
            , count: 100
        };
        connection.readStreamEventsForward(stream, readData, function (err, readResult) {
            if (err) return done(err);

            readResult.Status.should.equal('Success');
            readResult.Events.length.should.equal(3);
            readResult.Events.should.matchEventIdsWith(testEvents.slice(2));

            var setMetadata = {
                expectedMetastreamVersion: 0
                , metadata: client.createStreamMetadata({
                    maxCount: 2
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);

                connection.readStreamEventsForward(stream, readData, function (err, readResult) {
                    readResult.Status.should.equal('Success');
                    readResult.Events.length.should.equal(2);
                    readResult.Events.should.matchEventIdsWith(testEvents.slice(3));
                    done()
                })
            })
        })
    });

    it('after_setting_less_strict_max_count_read_stream_backward_reads_more_events', function (done) {
        var readData = {
            start: client.streamPosition.end
            , count: 100
        };
        connection.readStreamEventsBackward(stream, readData, function (err, readResult) {
            if (err) return done(err);

            readResult.Status.should.equal('Success');
            readResult.Events.length.should.equal(3);
            readResult.Events.should.matchEventIdsWith(reverse(testEvents.slice(2)));

            var setMetadata = {
                expectedMetastreamVersion: 0
                , metadata: client.createStreamMetadata({
                    maxCount: 4
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);

                connection.readStreamEventsBackward(stream, readData, function (err, readResult) {
                    readResult.Status.should.equal('Success');
                    readResult.Events.length.should.equal(4);
                    readResult.Events.should.matchEventIdsWith(reverse(testEvents.slice(1)));
                    done()
                })
            })
        })
    });

    it('after_setting_more_strict_max_count_read_stream_backward_reads_less_events', function (done) {
        var readData = {
            start: client.streamPosition.end
            , count: 100
        };
        connection.readStreamEventsBackward(stream, readData, function (err, readResult) {
            if (err) return done(err);

            readResult.Status.should.equal('Success');
            readResult.Events.length.should.equal(3);
            readResult.Events.should.matchEventIdsWith(reverse(testEvents.slice(2)));

            var setMetadata = {
                expectedMetastreamVersion: 0
                , metadata: client.createStreamMetadata({
                    maxCount: 2
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);

                connection.readStreamEventsBackward(stream, readData, function (err, readResult) {
                    readResult.Status.should.equal('Success');
                    readResult.Events.length.should.equal(2);
                    readResult.Events.should.matchEventIdsWith(reverse(testEvents.slice(3)));
                    done()
                })
            })
        })
    });

    afterEach(function (done) {
        es.cleanup(done)
    })
});
