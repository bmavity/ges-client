var client = require('../../../')
	, ges = require('ges-test-helper')
	, uuid = require('node-uuid')
	, createTestEvent = require('../../createTestEvent')
	, range = require('../../range')
	, streamWriter = require('../../streamWriter')
	, eventStreamCounter = require('../../eventStreamCounter')
	, should = require('../../shouldExtensions')


describe('appending_to_implicitly_created_stream_using_transaction', function() {
	var es
		, connection

	before(function(done) {
		ges({ tcpPort: 5012 }, function(err, memory) {
			if(err) return done(err)

			es = memory
			connection = client({ port: 5012 }, done)
		})
	})

  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0em1_idempotent')
    //var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0em1_idempotent'
  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0any_idempotent')
    //var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0any_idempotent'
  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e5_non_idempotent')
    //var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e5_non_idempotent'
  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e6_wev')
    //var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e6_wev'
  it('sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e4_wev')
    //var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_1e0_2e1_3e2_4e3_5e4_0e4_wev'
  it('sequence_0em1_0e0_non_idempotent')
    //var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_0e0_non_idempotent'
  it('sequence_0em1_0any_idempotent')
    //var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_0any_idempotent'
  it('sequence_0em1_0em1_idempotent')
    //var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_0em1_idempotent'
  it('sequence_0em1_1e0_2e1_1any_1any_idempotent')
    //var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_0em1_1e0_2e1_1any_1any_idempotent'
  it('sequence_S_0em1_1em1_E_S_0em1_1em1_2em1_E_idempotancy_fail')
    //var stream = 'appending_to_implicitly_created_stream_using_transaction_sequence_S_0em1_1em1_E_S_0em1_1em1_2em1_E_idempotancy_fail'


  after(function(done) {
  	connection.close(function() {
	  	es.on('exit', function(code, signal) {
		  	done()
	  	})
	  	es.on('error', done)
	  	es.kill()
  	})
  })
})