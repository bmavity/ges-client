var client = require('../../../')
    , ges = require('ges-test-helper').memory
    , uuid = require('node-uuid')
    , createTestEvent = require('../../createTestEvent')
    , range = require('../../range')
    , streamWriter = require('../../streamWriter')
    , eventStreamCounter = require('../../eventStreamCounter')
    , should = require('../../shouldExtensions');


describe('subscribe_should', function () {
    var es
        , connection;

    before(function (done) {
        es = ges(function (err, settings) {
            if (err) return done(err);

            connection = client(settings, done);
            es.addConnection(connection)
        })
    });

    it('be_able_to_subscribe_to_non_existing_stream_and_then_catch_new_event', function (done) {
        var stream = 'subscribe_should_be_able_to_subscribe_to_non_existing_stream_and_then_catch_created_event'
            , subscription = connection.subscribeToStream(stream)
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: createTestEvent()
            };

        subscription.on('event', function (evt) {
            true.should.be.true;
            done()
        });

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err)
        })
    });

    it('allow_multiple_subscriptions_to_same_stream', function (done) {
        var stream = 'subscribe_should_allow_multiple_subscriptions_to_same_stream'
            , sub1 = connection.subscribeToStream(stream)
            , sub2 = connection.subscribeToStream(stream)
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: createTestEvent()
            }
            , evtSub1
            , evtSub2;

        function testForFinish() {
            if (evtSub1 && evtSub2) {
                true.should.be.true;
                done()
            }
        }

        sub1.on('event', function (evt) {
            evtSub1 = true;
            testForFinish()
        });

        sub2.on('event', function (evt) {
            evtSub2 = true;
            testForFinish()
        });

        connection.appendToStream(stream, appendData, function (err) {
            if (err) return done(err)
        })
    });

    it('call_dropped_callback_after_unsubscribe_method_call', function (done) {
        var stream = 'subscribe_should_call_dropped_callback_after_unsubscribe_method_call'
            , subscription = connection.subscribeToStream(stream);

        subscription.on('dropped', function (evt) {
            done()
        });

        subscription.unsubscribe()
    });

    it('catch_deleted_events_as_well', function (done) {
        var stream = 'subscribe_should_catch_created_and_deleted_events_as_well'
            , subscription = connection.subscribeToStream(stream)
            , callResults = {};

        subscription.on('event', function (evt) {
            if (callResults.event) {
                should.fail()
            } else {
                callResults.event = true;
                if (callResults.event && callResults.dropped) {
                    should.pass();
                    done()
                }
            }
        });

        subscription.on('dropped', function (evt) {
            if (callResults.dropped) {
                should.fail()
            } else {
                callResults.dropped = true;
                if (callResults.event && callResults.dropped) {
                    should.pass();
                    done()
                }
            }
        });

        var deleteData = {
            expectedVersion: client.expectedVersion.emptyStream
            , hardDelete: true
        };

        connection.deleteStream(stream, deleteData, function (err) {
            if (err) return done(err);

            subscription.unsubscribe()
        })
    });

    after(function (done) {
        es.cleanup(done)
    })
});
