var util = require('util')
    , EventEmitter = require('events').EventEmitter;

module.exports = EsSubscription;


function EsSubscription() {
    if (!(this instanceof EsSubscription)) {
        return new EsSubscription()
    }

    EventEmitter.call(this)
}
util.inherits(EsSubscription, EventEmitter);


EsSubscription.prototype.unsubscribe = function () {
    var me = this;
    setImmediate(function () {
        me.emit('unsubscribe requested')
    })
};
