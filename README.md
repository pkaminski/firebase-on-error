firebase-on-error
=================

This module allows you to register callbacks to be notified when any Firebase operation reports an error.  This is useful when your app has no error recovery procedure beyond asking the user to reload the page (which is not a terrible approach, since Firebase is pretty reliable!).  You can also register callbacks to be notified when a write is being slow, so you can warn the user that their connection is bad and not all changes have yet been saved.

As a bonus, if you've registered any callbacks and `Promise` is declared in your browser (whether natively or via a polyfill), then all promises returned by Firebase operations will have a `finally` method polyfilled on them if necessary.  You're welcome!

The module adds four new public functions to the Firebase global class:

```javascript
  /**
   * Registers a global callback that will be invoked whenever any Firebase API indicates that an
   * error occurred, unless your onComplete function for that call returns (or is) IGNORE_ERROR.
   * Errors that occur on calls made before the first callback is registered will not be captured.
   * @param  {Function} callback The function to call back when an error occurs.  It will be passed
   *     the Firebase Error, the reference (or query or onDisconnect instance), the method name, and
   *     the arguments passed to the Firebase function call as arguments.
   * @return {Function} The callback function.
   */
Firebase.onError = function(callback) {...}

/**
 * Unregisters a global error callback.
 * @param  {Function} callback A previously registered callback.
 */
Firebase.offError = function(callback) {...}

/**
 * Registers a global callback that will be invoked whenever a Firebase API write function doesn't
 * complete fast enough.  The callback will be invoked every time the number of outstanding slow
 * calls changes (either up or down).  Write functions in Firebase are set, update, remove, push,
 * setWithPriority, setPriority, and transaction.
 * @param  {number} timeout The number of milliseconds a write function is allowed to run before
 *     it's added to the count of slow ones.
 * @param  {Function} callback The callback to invoke whenever the count of outstanding slow calls
 *     changes.  The arguments to the callback are the current count, +1 or -1 to indicate whether
 *     the count was just incremented or decremented, a short description of the stalled call, and
 *     the monotonously increasing serial number of the write.
 * @return {Function} The callback function, for convenience.
 */
Firebase.onSlowWrite = function(timeout, callback) {...}

/**
 * Unregisters a global slow write callback.
 * @param  {Function} callback A previously registered callback.
 */
Firebase.offSlowWrite = function(callback) {...}

/**
 * Requests that extra debugging information be provided for permission denied errors.  This works
 * by obtaining a special auth token (via the callback) that sets the simulated and debug flags,
 * and reissuing the failing request on a separate connection, then recording the debug
 * information that Firebase sends back.  Requires Promise to be available in the browser.
 * @param  {Function} simulatedTokenGenerator A callback that will be invoked with the uid of the
 *     user for whom permission was denied, and that returns a promise that resolves to a Firebase
 *     auth token for that uid with simulated and debug set to true.  You'll likely need to be
 *     running your own server loaded with your Firebase master secret to securely generate such a
 *     token.  You can generate tokens in Node.js like this, for example:
 *       var FirebaseTokenGenerator = require("firebase-token-generator");
 *       var tokenGenerator = new FirebaseTokenGenerator("<YOUR_FIREBASE_SECRET>");
 *       var token = tokenGenerator.createToken({uid: uid}, {simulate: true, debug: true});
 * @param  {Number} maxSimulatedCallDuration The maximum duration in milliseconds to allow for
 *     the simulated call to complete.  The callback and promise on the original call won't be
 *     resolved until the simulation finishes one way or another.  Defaults to 5 seconds.
 * @param  {Function} callFilter A function that decides which failed calls to debug.  It gets
 *     passed the target reference, the method name, and the args, and returns true to simulate
 *     the call with debugging turned on, and false to let it go.  By default, all failed calls
 *     get debugged.
 */
Firebase.debugPermissionDeniedErrors = function(
    simulatedTokenGenerator, maxSimulatedCallDuration, callFilter) {...}

```
