var notHandledReason = Object.create(Object.prototype, {
			NotReady: { value: 0 }
		, TooBusy: { value: 1 }
		, NotMaster: { value: 2 }
		})

module.exports = notHandledReason
