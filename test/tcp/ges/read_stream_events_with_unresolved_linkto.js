var client = require('../../../')
    , ges = require('ges-test-helper').memory
    , uuid = require('node-uuid')
    , createTestEvent = require('../../createTestEvent')
    , range = require('../../range')
    , streamWriter = require('../../streamWriter')
    , eventStreamCounter = require('../../eventStreamCounter')
    , should = require('../../shouldExtensions');


describe('read_stream_events_with_unresolved_linkto', function () {
    var es
        , connection
        , testEvents = createTestEvent(range(0, 20));

    before(function (done) {
        es = ges(function (err, settings) {
            if (err) return done(err);

            connection = client(settings, function (err) {
                if (err) return done(err);

                es.addConnection(connection);

                var setData = {
                    expectedMetastreamVersion: -1
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

                connection.setStreamMetadata('$all', setData, function (err) {
                    if (err) return done(err);

                    var appendData = {
                        expectedVersion: client.expectedVersion.emptyStream
                        , events: testEvents
                    };
                    connection.appendToStream('stream', appendData, function (err) {
                        if (err) return done(err);
                        var appendData2 = {
                            expectedVersion: client.expectedVersion.emptyStream
                            ,
                            events: client.createEventData(uuid.v4(), client.systemEventTypes.linkTo, false, new Buffer('0@stream'))
                        };
                        connection.appendToStream('links', appendData2, function (err) {
                            if (err) return done(err);

                            connection.deleteStream('stream', {expectedVersion: client.expectedVersion.any}, done)
                        })
                    })
                })
            })
        })
    });

    it('ensure_deleted_stream', function (done) {
        connection.readStreamEventsForward('stream', {start: 0, count: 100}, function (err, result) {
            if (err) return done(err);

            result.Status.should.equal('NoStream');
            result.Events.length.should.equal(0);
            done()
        })
    });

    it('returns_unresolved_linkto', function (done) {
        var readData = {
            start: 0
            , count: 1
            , resolveLinkTos: true
        };
        connection.readStreamEventsForward('links', readData, function (err, result) {
            if (err) return done(err);

            result.Events.length.should.equal(1);
            should.be.null(result.Events[0].Event);
            result.Events[0].Link.should.not.equal(null);
            done()
        })
    });

    after(function (done) {
        es.cleanup(done)
    })
});
