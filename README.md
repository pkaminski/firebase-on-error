firebase-on-error
=================

This module allows you to register callbacks to be notified when any Firebase operation reports an error.  This is useful when your app has no error recovery procedure beyond asking the user to reload the page (which is not a terrible approach, since Firebase is pretty reliable!).

The module adds two new public functions to the Firebase global class:

```javascript
/**
 * Registers a global callback that will be invoked whenever any Firebase API indicates that an
 * error occurred, unless your onComplete function for that call returns IGNORE_ERROR.  Errors
 * that occur on calls made before the first callback is registered will not be captured.
 * @param  {Function} callback The function to call back when an error occurs.  It will be passed
 *     the Firebase Error, the reference (or query or onDisconnect instance), and the method name
 *     as arguments.
 * @return {Function} The callback function.
 */
Firebase.onError = function(callback) {...}

/**
 * Unregisters a global error callback.
 * @param  {Function} callback A previously registered callback.
 */
Firebase.offError = function(callback) {...}
```
