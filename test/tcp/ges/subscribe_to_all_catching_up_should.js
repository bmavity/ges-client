var client = require('../../../')
    , ges = require('ges-test-helper').memory
    , uuid = require('node-uuid')
    , async = require('async')
    , createTestEvent = require('../../createTestEvent')
    , range = require('../../range')
    , streamWriter = require('../../streamWriter')
    , eventStreamCounter = require('../../eventStreamCounter')
    , should = require('../../shouldExtensions');


describe('subscribe_to_all_catching_up_should', function () {
    var es
        , connection;

    before(function (done) {
        es = ges(function (err, settings) {
            if (err) return done(err);

            connection = client(settings, function (err) {
                if (err) return done(err);

                es.addConnection(connection);

                var setData = {
                    expectedMetastreamVersion: client.expectedVersion.emptyStream
                    , metadata: client.createStreamMetadata({
                        acl: {
                            readRoles: client.systemRoles.all
                        }
                    })
                    , auth: {
                        username: client.systemUsers.admin
                        , password: client.systemUsers.defaultAdminPassword
                    }
                };

                connection.setStreamMetadata('$all', setData, done)
            })
        })
    });

    it('call_dropped_callback_after_stop_method_call', function (done) {
        var subscription = connection.subscribeToAllFrom();

        subscription.on('dropped', function (evt) {
            should.pass();
            done()
        });

        subscription.stop()
    });

    it('be_able_to_subscribe_to_empty_db', function (done) {
        var subscription = connection.subscribeToAllFrom()
            , hasError = false;

        function indicateError() {
            hasError = true
        }

        connection.subscribeToAll()
            .on('error', indicateError);

        subscription.on('dropped', function () {
            hasError.should.be.false;
            done()
        }).on('error', indicateError);

        subscription.on('live', function () {
            subscription.stop()
        })
    });

    it('read_all_existing_events_and_keep_listening_to_new_ones', function (done) {
        var subscribedEvents = [];

        function appendEvent(eventNumber) {
            return function (cb) {
                var appendData = {
                    expectedVersion: client.expectedVersion.emptyStream
                    , events: client.createEventData(uuid.v4(), 'et-' + eventNumber, false, new Buffer(3))
                };
                connection.appendToStream('stream-' + eventNumber, appendData, cb)
            }
        }

        async.series(range(0, 10).map(appendEvent), function (err) {
            if (err) return done(err);

            var subscription = connection.subscribeToAllFrom();

            subscription.on('event', function (evt) {
                if (isNotSystemEvent(evt)) {
                    subscribedEvents.push(evt)
                }

                if (subscribedEvents.length >= 20) {
                    subscription.stop()
                }
            }).on('dropped', function () {
                subscribedEvents.map(function (evt) {
                    return evt.OriginalEvent.EventType
                }).should.eql(range(0, 20).map(function (num) {
                        return 'et-' + num
                    }));
                done()
            }).on('error', done);

            async.series(range(10, 10).map(appendEvent), function (err) {
                if (err) return done(err)
            })
        })
    });

    it('filter_events_and_keep_listening_to_new_ones', function (done) {
        var subscribedEvents = []
            , lastProcessedEvent;

        function appendEvent(eventNumber) {
            return function (cb) {
                var appendData = {
                    expectedVersion: client.expectedVersion.emptyStream
                    , events: client.createEventData(uuid.v4(), 'et-' + eventNumber, false, new Buffer(3))
                };
                connection.appendToStream('stream2-' + eventNumber, appendData, cb)
            }
        }

        async.series(range(0, 10).map(appendEvent), function (err) {
            if (err) return done(err);
            var readData = {
                position: client.position.start
                , maxCount: 100
            };

            connection.readAllEventsForward(readData, function (err, readResult) {
                if (err) return done(err);

                var lastEvent = readResult.Events.concat([]).pop()
                    , subscription = connection.subscribeToAllFrom({
                        startProcessingAfter: lastEvent.OriginalPosition
                    });

                subscription.on('event', function (evt) {
                    lastProcessedEvent = evt;
                    if (isNotSystemEvent(evt)) {
                        subscribedEvents.push(evt)
                    }

                    if (subscribedEvents.length >= 10) {
                        subscription.stop()
                    }
                }).on('dropped', function () {
                    subscribedEvents.map(function (evt) {
                        return evt.OriginalEvent.EventType
                    }).should.eql(range(10, 10).map(function (num) {
                            return 'et-' + num
                        }));
                    lastProcessedEvent.OriginalPosition.should.eql(subscription.lastProcessedPosition);
                    done()
                }).on('error', done);

                async.series(range(10, 10).map(appendEvent), function (err) {
                    if (err) return done(err)
                })
            })
        })
    });

    it('filter_events_and_work_if_nothing_was_written_after_subscription', function (done) {
        var subscribedEvents = []
            , lastProcessedEvent;

        function appendEvent(eventNumber) {
            return function (cb) {
                var appendData = {
                    expectedVersion: client.expectedVersion.emptyStream
                    , events: client.createEventData(uuid.v4(), 'et-' + eventNumber, false, new Buffer(3))
                };
                connection.appendToStream('stream3-' + eventNumber, appendData, cb)
            }
        }

        async.series(range(0, 10).map(appendEvent), function (err) {
            if (err) return done(err);
            var readData = {
                position: client.position.start
                , maxCount: 500
            };

            connection.readAllEventsForward(readData, function (err, readResult) {
                if (err) return done(err);

                var streamEvents = readResult.Events.filter(isPartOfStream('stream3'))
                    , lastEvent = streamEvents[streamEvents.length - 2]
                    , subscription = connection.subscribeToAllFrom({
                        startProcessingAfter: lastEvent.OriginalPosition
                    });

                subscription.on('event', function (evt) {
                    //console.log(evt.OriginalPosition.commitPosition)
                    lastProcessedEvent = evt;
                    if (isPartOfStream('stream3')(evt)) {
                        subscribedEvents.push(evt)
                    }

                    if (subscribedEvents.length >= 1) {
                        subscription.stop()
                    }
                }).on('dropped', function () {
                    subscribedEvents.length.should.equal(1);
                    subscribedEvents[0].OriginalEvent.EventType.should.equal('et-9');
                    lastProcessedEvent.OriginalPosition.should.eql(subscription.lastProcessedPosition);
                    done()
                }).on('error', done)
            })
        })
    });

    function isNotSystemEvent(evt) {
        return !isPartOfStream('$')(evt)
    }

    function isPartOfStream(streamName) {
        return function (evt) {
            return evt.Event.EventStreamId.indexOf(streamName) === 0
        }
    }

    after(function (done) {
        es.cleanup(done)
    })
});
