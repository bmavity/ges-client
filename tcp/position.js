module.exports = Position

Object.defineProperties(module.exports, {
	start: { value: new Position(0, 0) }
, end: { value: new Position(-1, -1) }
})

function Position(commitPosition, preparePosition) {
	if(!(this instanceof Position)) {
		return new Position(commitPosition, preparePosition)
	}

	Object.defineProperties(this, {
		commitPosition: { value: commitPosition }
	, preparePosition: { value: preparePosition }
	})
}