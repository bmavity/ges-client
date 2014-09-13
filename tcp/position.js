module.exports = Position

Object.defineProperties(module.exports, {
	start: { value: new Position(0, 0) }
, end: { value: new Position(-1, -1) }
})

function Position(commitPosition, preparePosition) {
	if(!(this instanceof Position)) {
		return new Position(commitPosition, preparePosition)
	}

	if(!preparePosition) {
		preparePosition = commitPosition.prepare_position
		commitPosition = commitPosition.commit_position
	}

	Object.defineProperties(this, {
		commitPosition: { value: commitPosition, enumerable: true }
	, CommitPosition: { value: commitPosition, enumerable: true }
	, preparePosition: { value: preparePosition, enumerable: true }
	, PreparePosition: { value: preparePosition, enumerable: true }
	})
}