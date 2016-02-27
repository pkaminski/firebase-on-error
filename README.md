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
 *     changes.  The current count is passed as the only argument to the callback.
 * @return {Function} The callback function, for convenience.
 */
Firebase.onSlowWrite = function(timeout, callback) {...}

/**
 * Unregisters a global slow write callback.
 * @param  {Function} callback A previously registered callback.
 */
Firebase.offSlowWrite = function(callback) {...}

```
