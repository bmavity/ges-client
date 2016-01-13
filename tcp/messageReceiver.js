var util = require('util')
    , EventEmitter = require('events').EventEmitter
    , parser = require('./messageParser')
    , framer = require('./lengthPrefixMessageFramer');

module.exports = MessageReceiver;


function MessageReceiver() {
    if (!(this instanceof MessageReceiver)) {
        return new MessageReceiver()
    }

    EventEmitter.call(this);

    this._incompletePacket = null
}
util.inherits(MessageReceiver, EventEmitter);

MessageReceiver.prototype.processData = function (data) {
    if (this._incompletePacket) {
        data = this._combineWithIncompletePacket(data)
    }

    var contentLength = framer.getContentLength(data)
        , expectedPacketLength = contentLength + 4;

    if (data.length === expectedPacketLength) {
        this._handleCompletePacket(data)
    } else if (data.length > expectedPacketLength) {
        this._handleMultiplePackets(data, expectedPacketLength)
    } else {
        this._handleIncompletePacket(data, expectedPacketLength)
    }
};

MessageReceiver.prototype._combineWithIncompletePacket = function (packet) {
    var newPacket = new Buffer(this._incompletePacket.length + packet.length);
    this._incompletePacket.copy(newPacket, 0);
    packet.copy(newPacket, this._incompletePacket.length);
    this._incompletePacket = null;
    return newPacket
};

MessageReceiver.prototype._handleCompletePacket = function (packet) {
    var unframedPacket = framer.unframe(packet);
    this.emit('message', unframedPacket)
};

MessageReceiver.prototype._handleIncompletePacket = function (packet, expectedPacketLength) {
    //console.log('Incomplete Packet (wanted: ' + expectedPacketLength + " bytes, got: " + packet.length + " bytes)")
    this._incompletePacket = packet
};

MessageReceiver.prototype._handleMultiplePackets = function (packet, expectedPacketLength) {
    //console.log("Packet too big, trying to split into multiple packets (wanted: " + expectedPacketLength + " bytes, got: " + packet.length + " bytes)")
    this.processData(packet.slice(0, expectedPacketLength));
    this.processData(packet.slice(expectedPacketLength))
};