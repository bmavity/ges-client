var client = require('../../../')
    , ges = require('ges-test-helper').memory
    , uuid = require('node-uuid')
    , createTestEvent = require('../../createTestEvent')
    , range = require('../../range')
    , streamWriter = require('../../streamWriter')
    , eventStreamCounter = require('../../eventStreamCounter')
    , should = require('../../shouldExtensions');


describe('subscribe_to_all_should', function () {
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

    it('allow_multiple_subscriptions', function (done) {
        var stream = 'subscribe_to_all_should_allow_multiple_subscriptions'
            , sub1 = connection.subscribeToAll()
            , sub2 = connection.subscribeToAll()
            , appendData = {
                expectedVersion: client.expectedVersion.emptyStream
                , events: createTestEvent()
            }
            , evtSub1
            , evtSub2
            , hasFinished
            , hasErr;

        function testForFinish() {
            if (evtSub1 && evtSub2 && !hasFinished && !hasErr) {
                hasFinished = true;
                should.pass();
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
            if (err) {
                hasErr = true;
                done(err)
            }
        })
    });

    it('catch_deleted_events_as_well', function (done) {
        var stream = 'subscribe_to_all_should_catch_created_and_deleted_events_as_well'
            , subscription = connection.subscribeToAll()
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
