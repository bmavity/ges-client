var client = require('../../')
    , ges = require('ges-test-helper').memory;

describe('connection, when created', function () {
    var es
        , esSettings;

    before(function (done) {
        es = ges(function (err, settings) {
            if (err) return done(err);

            esSettings = settings;
            done()
        })
    });

    it('with a callback, should be connected when callback is called', function (done) {
        client(esSettings, function (err, connection) {
            (err === null).should.be.true;
            connection.isInState('Connected').should.be.true;
            connection.close(done)
        })
    });

    it('without a callback, should raise connect event with endpoint as data', function (done) {
        var connection = client(esSettings);

        connection.on('connect', function (message) {
            message.endPoint.port.should.equal(esSettings.port);
            connection.isInState('Connected').should.be.true;
            connection.close(done)
        })
    });

    it('without a callback and with requireExplicitConnection flag set, should raise connect event with endpoint as data', function (done) {
        var connection = client(esSettings);

        connection.on('connect', function (message) {
            message.endPoint.port.should.equal(esSettings.port);
            connection.isInState('Connected').should.be.true;
            connection.close(done)
        });

        connection.connect()
    });

    it('with a callback and with requireExplicitConnection flag set, should be connected when callback is called', function (done) {
        var con = client(esSettings, function (err, connection) {
            (err === null).should.be.true;
            connection.isInState('Connected').should.be.true;
            connection.close(done)
        });

        con.connect()
    });

    after(function (done) {
        es.cleanup(done)
    })
});
