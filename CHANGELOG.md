# ges-client ChangeLog

## 2015-09-18, Version 0.10.0, @bmavity

### Notable changes

* Memory Leak Fix [#39](https://github.com/bmavity/ges-client/pull/39)
* Babel error Fix (thanks @reharik) [#47](https://github.com/bmavity/ges-client/pull/47)
* More stable test runner [#46](https://github.com/bmavity/ges-client/pull/46)
* **Potential Breaking** Dropping a Catch Up Subscription is now async, it was causing subscription to not properly update it's last processed event
* Subscription Operations now verify a connection is writable before attempting to send a request to the server
* Change to use protobufjs library instead of abandoned protobuf library [#51](https://github.com/bmavity/ges-client/pull/51)
* **Potential Breaking** Due to previous, commitPosition and preparePosition are now strings

### Known issues

See https://github.com/bmavity/labels/bug for complete and current list of known issues.

* Attempting a subscription on a closed connection causes an unhandled exception.
* Running full test suite still giving false failures due to subscription drop timing issue.
