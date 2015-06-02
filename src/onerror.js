(function() {
  'use strict';

  Firebase.IGNORE_ERROR = {};  // unique marker object
  var errorCallbacks = [];
  var interceptInPlace = false;
  var noop = function() {};

  /**
   * Registers a global callback that will be invoked whenever any Firebase API indicates that an
   * error occurred, unless your onComplete function for that call returns IGNORE_ERROR.  Errors
   * that occur on calls made before the first callback is registered will not be captured.
   * @param  {Function} callback The function to call back when an error occurs.  It will be passed
   *     the Firebase Error, the reference (or query or onDisconnect instance), the method name, and
   *     the arguments passed to the Firebase function call as arguments.
   * @return {Function} The callback function.
   */
  Firebase.onError = function(callback) {
    interceptErrorCallbacks();
    errorCallbacks.push(callback);
    return callback;
  };

  /**
   * Unregisters a global error callback.
   * @param  {Function} callback A previously registered callback.
   */
  Firebase.offError = function(callback) {
    var k = errorCallbacks.indexOf(callback);
    if (k !== -1) errorCallbacks.splice(k, 1);
  };

  function wrapOnComplete(target, methods) {
    Object.keys(methods).forEach(function(methodName) {
      var onCompleteArgIndex = methods[methodName];
      var wrappedMethod = target[methodName];
      target[methodName] = function() {
        var onComplete = arguments[onCompleteArgIndex];
        var hasOnComplete = typeof onComplete === 'function' || typeof onComplete === 'undefined';
        if (typeof onComplete !== 'function') onComplete = noop;
        var args = Array.prototype.slice.call(arguments);
        var ref = this;
        var wrappedOnComplete = function(error) {
          var onCompleteCallbackResult = onComplete.apply(this, arguments);
          if (error && onCompleteCallbackResult !== Firebase.IGNORE_ERROR) {
            errorCallbacks.forEach(function(callback) {
              callback(error, ref, methodName, args);
            });
          }
        };
        args.splice(onCompleteArgIndex, hasOnComplete ? 1 : 0, wrappedOnComplete);
        return wrappedMethod.apply(this, args);
      };
    });
    return target;
  }

  function wrapQuery(query) {
    wrapOnComplete(query, {on: 2, once: 2});
    ['orderByChild', 'orderByKey', 'orderByValue', 'orderByPriority', 'limit', 'limitToFirst',
     'limitToLast', 'startAt', 'endAt', 'equalTo'].forEach(function(method) {
      var wrappedMethod = query[method];
      query[method] = function() {
        return wrapQuery(wrappedMethod.apply(this, arguments));
      };
    });
    return query;
  }

  function interceptErrorCallbacks() {
    if (interceptInPlace) return;
    wrapOnComplete(Firebase.prototype, {
      auth: 1, authWithCustomToken: 1, authAnonymously: 0, authWithPassword: 1,
      authWithOAuthPopup: 1, authWithOAuthRedirect: 1, authWithOAuthToken: 2,
      set: 1, update: 1, setWithPriority: 2, setPriority: 1, transaction: 1,
      // 'remove' and 'push' delegate to 'set'; 'on' and 'once' will be wrapped by wrapQuery below
      createUser: 1, changeEmail: 1, changePassword: 1, removeUser: 1, resetPassword: 1
    });
    var onDisconnect = Firebase.prototype.onDisconnect;
    Firebase.prototype.onDisconnect = function() {
      return wrapOnComplete(onDisconnect.apply(this, arguments), {
        set: 1, setWithPriority: 2, update: 1, remove: 0, cancel: 0
      });
    };
    wrapQuery(Firebase.prototype);
    interceptInPlace = true;
  }
})();
