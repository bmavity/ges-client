var client = require('../../../')
    , ges = require('ges-test-helper').memory
    , uuid = require('node-uuid')
    , createTestEvent = require('../../createTestEvent')
    , range = require('../../range')
    , streamWriter = require('../../streamWriter')
    , eventStreamCounter = require('../../eventStreamCounter')
    , should = require('../../shouldExtensions');

describe('read_event_should', function () {
    var es
        , connection
        , eventId0 = uuid.v4()
        , eventId1 = uuid.v4();
    before(function (done) {
        es = ges(function (err, settings) {
            if (err) return done(err);

            connection = client(settings, function (err) {
                if (err) return done(err);

                es.addConnection(connection);
                var appendData = {
                    expectedVersion: -1
                    , events: [
                        client.createEventData(eventId0, 'event0', false, new Buffer(3), new Buffer(2))
                        , client.createEventData(eventId1, 'event1', true, new Buffer(7), new Buffer(10))
                    ]
                };

                connection.appendToStream('test-stream', appendData, function (err) {
                    if (err) return done(err);
                    var deleteData = {
                        expectedVersion: client.expectedVersion.emptyStream
                        , hardDelete: true
                    };

                    connection.deleteStream('deleted-stream', deleteData, done)
                })
            })
        })
    });

    it('throw_if_stream_id_is_null', function (done) {
        var readData = {
            eventNumber: 0
        };
        connection.readEvent(null, readData, function (err) {
            err.message.should.endWith('cannot be null or empty.');
            done()
        })
    });

    it('throw_if_stream_id_is_empty', function (done) {
        var readData = {
            eventNumber: 0
        };
        connection.readEvent('', readData, function (err) {
            err.message.should.endWith('cannot be null or empty.');
            done()
        })
    });

    it('throw_if_event_number_is_less_than_minus_one', function (done) {
        var readData = {
            eventNumber: -2
        };
        connection.readEvent('stream', readData, function (err) {
            err.message.should.endWith('cannot be less than -1.');
            done()
        })
    });

    it('notify_using_status_code_if_stream_not_found', function (done) {
        var readData = {
            eventNumber: 5
        };
        connection.readEvent('unexisting-stream', readData, function (err, result) {
            if (err) return done(err);

            result.Status.should.equal('NoStream');
            should.be.null(result.Event);
            result.Stream.should.equal('unexisting-stream');
            result.EventNumber.should.equal(5);
            done()
        })
    });

    it('return_no_stream_if_requested_last_event_in_empty_stream', function (done) {
        var readData = {
            eventNumber: -1
        };
        connection.readEvent('some-really-empty-stream', readData, function (err, result) {
            if (err) return done(err);

            result.Status.should.equal('NoStream');
            done()
        })
    });

    it('notify_using_status_code_if_stream_was_deleted', function (done) {
        var readData = {
            eventNumber: 5
        };
        connection.readEvent('deleted-stream', readData, function (err, result) {
            if (err) return done(err);

            result.Status.should.equal('StreamDeleted');
            should.be.null(result.Event);
            result.Stream.should.equal('deleted-stream');
            result.EventNumber.should.equal(5);
            done()
        })
    });

    it('notify_using_status_code_if_stream_does_not_have_event', function (done) {
        var readData = {
            eventNumber: 5
        };
        connection.readEvent('test-stream', readData, function (err, result) {
            if (err) return done(err);

            result.Status.should.equal('NotFound');
            should.be.null(result.Event);
            result.Stream.should.equal('test-stream');
            result.EventNumber.should.equal(5);
            done()
        })
    });

    it('return_existing_event', function (done) {
        var readData = {
            eventNumber: 0
        };
        connection.readEvent('test-stream', readData, function (err, result) {
            if (err) return done(err);

            var originalEvent = result.Event.OriginalEvent;
            result.Status.should.equal('Success');
            originalEvent.EventId.should.equal(eventId0);
            result.Stream.should.equal('test-stream');
            result.EventNumber.should.equal(0);
            originalEvent.Created.should.be.greaterThan(0);
            originalEvent.CreatedEpoch.should.be.greaterThan(0);
            done()
        })
    });

    it('retrieve_the_is_json_flag_properly', function (done) {
        var readData = {
            eventNumber: 1
        };
        connection.readEvent('test-stream', readData, function (err, result) {
            if (err) return done(err);

            var originalEvent = result.Event.OriginalEvent;
            result.Status.should.equal('Success');
            originalEvent.EventId.should.equal(eventId1);
            originalEvent.IsJson.should.be.true;
            done()
        })
    });

    it('return_last_event_in_stream_if_event_number_is_minus_one', function (done) {
        var readData = {
            eventNumber: -1
        };
        connection.readEvent('test-stream', readData, function (err, result) {
            if (err) return done(err);

            var originalEvent = result.Event.OriginalEvent;
            result.Status.should.equal('Success');
            originalEvent.EventId.should.equal(eventId1);
            result.Stream.should.equal('test-stream');
            result.EventNumber.should.equal(-1);
            originalEvent.Created.should.be.greaterThan(0);
            originalEvent.CreatedEpoch.should.be.greaterThan(0);
            done()
        })
    });

    after(function (done) {
        es.cleanup(done)
    })
});
