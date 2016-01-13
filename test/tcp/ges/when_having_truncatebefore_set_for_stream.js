var client = require('../../../')
    , ges = require('ges-test-helper').memory
    , uuid = require('node-uuid')
    , createTestEvent = require('../../createTestEvent')
    , range = require('../../range')
    , reverse = require('../../reverse')
    , streamWriter = require('../../streamWriter')
    , eventStreamCounter = require('../../eventStreamCounter')
    , should = require('../../shouldExtensions');


describe('when_having_truncatebefore_set_for_stream', function () {
    var es
        , connection;

    before(function (done) {
        es = ges(function (err, settings) {
            if (err) return done(err);

            connection = client(settings, done);
            es.addConnection(connection)
        })
    });

    it('read_event_respects_truncatebefore', function (done) {
        var stream = 'read_event_respects_truncatebefore'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };
            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);

                connection.readEvent(stream, {eventNumber: 1}, function (err, readResult) {
                    if (err) return done(err);

                    readResult.Status.should.equal('NotFound');

                    connection.readEvent(stream, {eventNumber: 2}, function (err, readResult) {
                        if (err) return done(err);

                        readResult.Status.should.equal('Success');
                        readResult.Event.OriginalEvent.EventId.should.equal(testEvents[2].EventId);
                        done()
                    })
                })
            })
        })
    });

    it('read_stream_forward_respects_truncatebefore', function (done) {
        var stream = 'read_stream_forward_respects_truncatebefore'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);
                var readData = {
                    start: 0
                    , count: 100
                };

                connection.readStreamEventsForward(stream, readData, function (err, readResult) {
                    if (err) return done(err);

                    readResult.Status.should.equal('Success');
                    readResult.Events.length.should.equal(3);
                    readResult.Events.should.matchEventIdsWith(testEvents.slice(2));
                    done()
                })
            })
        })
    });

    it('read_stream_backward_respects_truncatebefore', function (done) {
        var stream = 'read_stream_backward_respects_truncatebefore'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);
                var readData = {
                    start: client.streamPosition.end
                    , count: 100
                };

                connection.readStreamEventsBackward(stream, readData, function (err, readResult) {
                    if (err) return done(err);

                    readResult.Status.should.equal('Success');
                    readResult.Events.length.should.equal(3);
                    readResult.Events.should.matchEventIdsWith(reverse(testEvents.slice(2)));
                    done()
                })
            })
        })
    });

    it('after_setting_less_strict_truncatebefore_read_event_reads_more_events', function (done) {
        var stream = 'after_setting_less_strict_truncatebefore_read_event_reads_more_events'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };
            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);

                connection.readEvent(stream, {eventNumber: 1}, function (err, readResult) {
                    if (err) return done(err);

                    readResult.Status.should.equal('NotFound');

                    connection.readEvent(stream, {eventNumber: 2}, function (err, readResult) {
                        if (err) return done(err);

                        readResult.Status.should.equal('Success');
                        readResult.Event.OriginalEvent.EventId.should.equal(testEvents[2].EventId);
                        var setMetadata = {
                            expectedMetastreamVersion: 0
                            , metadata: client.createStreamMetadata({
                                truncateBefore: 1
                            })
                        };

                        connection.setStreamMetadata(stream, setMetadata, function (err) {
                            if (err) return done(err);

                            connection.readEvent(stream, {eventNumber: 0}, function (err, readResult) {
                                if (err) return done(err);

                                readResult.Status.should.equal('NotFound');

                                connection.readEvent(stream, {eventNumber: 1}, function (err, readResult) {
                                    if (err) return done(err);

                                    readResult.Status.should.equal('Success');
                                    readResult.Event.OriginalEvent.EventId.should.equal(testEvents[1].EventId);
                                    done()
                                })
                            })
                        })
                    })
                })
            })
        })
    });

    it('after_setting_more_strict_truncatebefore_read_event_reads_less_events', function (done) {
        var stream = 'after_setting_more_strict_truncatebefore_read_event_reads_less_events'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };
            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);

                connection.readEvent(stream, {eventNumber: 1}, function (err, readResult) {
                    if (err) return done(err);

                    readResult.Status.should.equal('NotFound');

                    connection.readEvent(stream, {eventNumber: 2}, function (err, readResult) {
                        if (err) return done(err);

                        readResult.Status.should.equal('Success');
                        readResult.Event.OriginalEvent.EventId.should.equal(testEvents[2].EventId);
                        var setMetadata = {
                            expectedMetastreamVersion: 0
                            , metadata: client.createStreamMetadata({
                                truncateBefore: 3
                            })
                        };

                        connection.setStreamMetadata(stream, setMetadata, function (err) {
                            if (err) return done(err);

                            connection.readEvent(stream, {eventNumber: 2}, function (err, readResult) {
                                if (err) return done(err);

                                readResult.Status.should.equal('NotFound');

                                connection.readEvent(stream, {eventNumber: 3}, function (err, readResult) {
                                    if (err) return done(err);

                                    readResult.Status.should.equal('Success');
                                    readResult.Event.OriginalEvent.EventId.should.equal(testEvents[3].EventId);
                                    done()
                                })
                            })
                        })
                    })
                })
            })
        })
    });

    it('less_strict_max_count_doesnt_change_anything_for_event_read', function (done) {
        var stream = 'less_strict_max_count_doesnt_change_anything_for_event_read'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };
            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);

                connection.readEvent(stream, {eventNumber: 1}, function (err, readResult) {
                    if (err) return done(err);

                    readResult.Status.should.equal('NotFound');

                    connection.readEvent(stream, {eventNumber: 2}, function (err, readResult) {
                        if (err) return done(err);

                        readResult.Status.should.equal('Success');
                        readResult.Event.OriginalEvent.EventId.should.equal(testEvents[2].EventId);
                        var setMetadata = {
                            expectedMetastreamVersion: 0
                            , metadata: client.createStreamMetadata({
                                truncateBefore: 1
                                , maxCount: 4
                            })
                        };

                        connection.setStreamMetadata(stream, setMetadata, function (err) {
                            if (err) return done(err);

                            connection.readEvent(stream, {eventNumber: 1}, function (err, readResult) {
                                if (err) return done(err);

                                readResult.Status.should.equal('Success');

                                connection.readEvent(stream, {eventNumber: 2}, function (err, readResult) {
                                    if (err) return done(err);

                                    readResult.Status.should.equal('Success');
                                    readResult.Event.OriginalEvent.EventId.should.equal(testEvents[2].EventId);
                                    done()
                                })
                            })
                        })
                    })
                })
            })
        })
    });

    it('more_strict_max_count_gives_less_events_for_event_read', function (done) {
        var stream = 'more_strict_max_count_gives_less_events_for_event_read'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };
            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);

                connection.readEvent(stream, {eventNumber: 1}, function (err, readResult) {
                    if (err) return done(err);

                    readResult.Status.should.equal('NotFound');

                    connection.readEvent(stream, {eventNumber: 2}, function (err, readResult) {
                        if (err) return done(err);

                        readResult.Status.should.equal('Success');
                        readResult.Event.OriginalEvent.EventId.should.equal(testEvents[2].EventId);
                        var setMetadata = {
                            expectedMetastreamVersion: 0
                            , metadata: client.createStreamMetadata({
                                truncateBefore: 1
                                , maxCount: 2
                            })
                        };

                        connection.setStreamMetadata(stream, setMetadata, function (err) {
                            if (err) return done(err);

                            connection.readEvent(stream, {eventNumber: 2}, function (err, readResult) {
                                if (err) return done(err);

                                readResult.Status.should.equal('NotFound');

                                connection.readEvent(stream, {eventNumber: 3}, function (err, readResult) {
                                    if (err) return done(err);

                                    readResult.Status.should.equal('Success');
                                    readResult.Event.OriginalEvent.EventId.should.equal(testEvents[3].EventId);
                                    done()
                                })
                            })
                        })
                    })
                })
            })
        })
    });

    it('after_setting_less_strict_truncatebefore_read_stream_forward_reads_more_events', function (done) {
        var stream = 'after_setting_less_strict_truncatebefore_read_stream_forward_reads_more_events'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);
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
                            truncateBefore: 1
                        })
                    };

                    connection.setStreamMetadata(stream, setMetadata, function (err) {
                        if (err) return done(err);
                        var readData = {
                            start: 0
                            , count: 100
                        };

                        connection.readStreamEventsForward(stream, readData, function (err, readResult) {
                            if (err) return done(err);

                            readResult.Status.should.equal('Success');
                            readResult.Events.length.should.equal(4);
                            readResult.Events.should.matchEventIdsWith(testEvents.slice(1));
                            done()
                        })
                    })
                })
            })
        })
    });

    it('after_setting_more_strict_truncatebefore_read_stream_forward_reads_less_events', function (done) {
        var stream = 'after_setting_more_strict_truncatebefore_read_stream_forward_reads_less_events'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);
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
                            truncateBefore: 3
                        })
                    };

                    connection.setStreamMetadata(stream, setMetadata, function (err) {
                        if (err) return done(err);
                        var readData = {
                            start: 0
                            , count: 100
                        };

                        connection.readStreamEventsForward(stream, readData, function (err, readResult) {
                            if (err) return done(err);

                            readResult.Status.should.equal('Success');
                            readResult.Events.length.should.equal(2);
                            readResult.Events.should.matchEventIdsWith(testEvents.slice(3));
                            done()
                        })
                    })
                })
            })
        })
    });

    it('less_strict_max_count_doesnt_change_anything_for_stream_forward_read', function (done) {
        var stream = 'less_strict_max_count_doesnt_change_anything_for_stream_forward_read'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);
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
                            truncateBefore: 2
                            , maxCount: 4
                        })
                    };

                    connection.setStreamMetadata(stream, setMetadata, function (err) {
                        if (err) return done(err);
                        var readData = {
                            start: 0
                            , count: 100
                        };

                        connection.readStreamEventsForward(stream, readData, function (err, readResult) {
                            if (err) return done(err);

                            readResult.Status.should.equal('Success');
                            readResult.Events.length.should.equal(3);
                            readResult.Events.should.matchEventIdsWith(testEvents.slice(2));
                            done()
                        })
                    })
                })
            })
        })
    });

    it('more_strict_max_count_gives_less_events_for_stream_forward_read', function (done) {
        var stream = 'more_strict_max_count_gives_less_events_for_stream_forward_read'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);
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
                            truncateBefore: 2
                            , maxCount: 2
                        })
                    };

                    connection.setStreamMetadata(stream, setMetadata, function (err) {
                        if (err) return done(err);
                        var readData = {
                            start: 0
                            , count: 100
                        };

                        connection.readStreamEventsForward(stream, readData, function (err, readResult) {
                            if (err) return done(err);

                            readResult.Status.should.equal('Success');
                            readResult.Events.length.should.equal(2);
                            readResult.Events.should.matchEventIdsWith(testEvents.slice(3));
                            done()
                        })
                    })
                })
            })
        })
    });

    it('after_setting_less_strict_truncatebefore_read_stream_backward_reads_more_events', function (done) {
        var stream = 'after_setting_less_strict_truncatebefore_read_stream_backward_reads_more_events'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);
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
                            truncateBefore: 1
                        })
                    };

                    connection.setStreamMetadata(stream, setMetadata, function (err) {
                        if (err) return done(err);
                        var readData = {
                            start: client.streamPosition.end
                            , count: 100
                        };

                        connection.readStreamEventsBackward(stream, readData, function (err, readResult) {
                            if (err) return done(err);

                            readResult.Status.should.equal('Success');
                            readResult.Events.length.should.equal(4);
                            readResult.Events.should.matchEventIdsWith(reverse(testEvents.slice(1)));
                            done()
                        })
                    })
                })
            })
        })
    });

    it('after_setting_more_strict_truncatebefore_read_stream_backward_reads_less_events', function (done) {
        var stream = 'after_setting_more_strict_truncatebefore_read_stream_backward_reads_less_events'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);
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
                            truncateBefore: 3
                        })
                    };

                    connection.setStreamMetadata(stream, setMetadata, function (err) {
                        if (err) return done(err);
                        var readData = {
                            start: client.streamPosition.end
                            , count: 100
                        };

                        connection.readStreamEventsBackward(stream, readData, function (err, readResult) {
                            if (err) return done(err);

                            readResult.Status.should.equal('Success');
                            readResult.Events.length.should.equal(2);
                            readResult.Events.should.matchEventIdsWith(reverse(testEvents.slice(3)));
                            done()
                        })
                    })
                })
            })
        })
    });

    it('less_strict_max_count_doesnt_change_anything_for_stream_backward_read', function (done) {
        var stream = 'less_strict_max_count_doesnt_change_anything_for_stream_backward_read'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);
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
                            truncateBefore: 2
                            , maxCount: 4
                        })
                    };

                    connection.setStreamMetadata(stream, setMetadata, function (err) {
                        if (err) return done(err);
                        var readData = {
                            start: client.streamPosition.end
                            , count: 100
                        };

                        connection.readStreamEventsBackward(stream, readData, function (err, readResult) {
                            if (err) return done(err);

                            readResult.Status.should.equal('Success');
                            readResult.Events.length.should.equal(3);
                            readResult.Events.should.matchEventIdsWith(reverse(testEvents.slice(2)));
                            done()
                        })
                    })
                })
            })
        })
    });

    it('more_strict_max_count_gives_less_events_for_stream_backward_read', function (done) {
        var stream = 'more_strict_max_count_gives_less_events_for_stream_backward_read'
            , testEvents = createTestEvent(range(0, 5))
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: testEvents
            };

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err);
            var setMetadata = {
                expectedMetastreamVersion: client.expectedVersion.emptyStream
                , metadata: client.createStreamMetadata({
                    truncateBefore: 2
                })
            };

            connection.setStreamMetadata(stream, setMetadata, function (err) {
                if (err) return done(err);
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
                            truncateBefore: 2
                            , maxCount: 2
                        })
                    };

                    connection.setStreamMetadata(stream, setMetadata, function (err) {
                        if (err) return done(err);
                        var readData = {
                            start: client.streamPosition.end
                            , count: 100
                        };

                        connection.readStreamEventsBackward(stream, readData, function (err, readResult) {
                            if (err) return done(err);

                            readResult.Status.should.equal('Success');
                            readResult.Events.length.should.equal(2);
                            readResult.Events.should.matchEventIdsWith(reverse(testEvents.slice(3)));
                            done()
                        })
                    })
                })
            })
        })
    });


    after(function (done) {
        es.cleanup(done)
    })
});
