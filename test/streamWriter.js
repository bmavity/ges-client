var client = require('../')
    , should = require('should')
    , async = require('async')
    , any = client.expectedVersion.any;

module.exports = StreamWriter;

function StreamWriter(store, stream, version) {
    if (!(this instanceof StreamWriter)) {
        return new StreamWriter(store, stream, version)
    }

    this._store = store;
    this._stream = stream;
    this._version = version
}

StreamWriter.prototype.append = function (events, cb) {
    events = Array.isArray(events) ? events : [events];

    var me = this
        , toDo = events.map(function (evt, i) {
            return me._getAppendSingle(evt, i)
        })
        , tailWriter = function (events, version, twcb) {
            var appendData = {
                expectedVersion: version
                , events: events
            };
            me._store.appendToStream(me._stream, appendData, function (err, appendResult) {
                if (err) return twcb(err);
                twcb(null, tailWriter)
            })
        };

    async.series(toDo, function (err) {
        if (err) return cb(err);
        cb(null, tailWriter)
    })
};

StreamWriter.prototype._getAppendSingle = function (evt, i) {
    var me = this;

    return function (cb) {
        var expVer = me._version === any ? any : me._version + i
            , appendData = {
                expectedVersion: expVer
                , events: evt
            };

        me._store.appendToStream(me._stream, appendData, function (err, appendResult) {
            if (me._version !== any) {
                appendResult.NextExpectedVersion.should.equal(expVer + 1)
            }
            cb(null)
        })
    }
};

