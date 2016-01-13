module.exports = Position;

Object.defineProperties(module.exports, {
    start: {value: new Position(0, 0)}
    , end: {value: new Position(-1, -1)}
});

function Position(commitPosition, preparePosition) {
    if (!(this instanceof Position)) {
        return new Position(commitPosition, preparePosition)
    }

    if (!preparePosition && preparePosition !== 0) {
        preparePosition = commitPosition.preparePosition;
        commitPosition = commitPosition.commitPosition
    }

    Object.defineProperties(this, {
        commitPosition: {value: commitPosition, enumerable: true}
        , CommitPosition: {value: commitPosition, enumerable: true}
        , preparePosition: {value: preparePosition, enumerable: true}
        , PreparePosition: {value: preparePosition, enumerable: true}
    })
}

Position.prototype.compare = function (other) {
    var thisCommit = parseInt(this.commitPosition, 10)
        , otherCommit = parseInt(other.commitPosition, 10)
        , thisPrepare = parseInt(this.preparePosition, 10)
        , otherPrepare = parseInt(other.preparePosition, 10);
    if (thisCommit > otherCommit) return 1;
    if (thisCommit < otherCommit) return -1;
    if (thisPrepare > otherPrepare) return 1;
    if (thisPrepare < otherPrepare) return -1;
    return 0
};