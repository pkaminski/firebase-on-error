(function() {
  'use strict';

  Firebase.IGNORE_ERROR = {};  // unique marker object
  var errorCallbacks = [], slowWriteCallbackRecords = [];
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
  Firebase.onSlowWrite = function(timeout, callback) {
    interceptErrorCallbacks();
    slowWriteCallbackRecords.push({timeout: timeout, callback: callback, count: 0});
    return callback;
  };

  /**
   * Unregisters a global slow write callback.
   * @param  {Function} callback A previously registered callback.
   */
  Firebase.offSlowWrite = function(callback) {
    for (var i = 0; i < slowWriteCallbackRecords.length; i++) {
      var record = slowWriteCallbackRecords[i];
      if (record.callback === callback) {
        slowWriteCallbackRecords.splice(i, 1);
        return;
      }
    }
  };

  function wrapOnComplete(target, methods, isWrite) {
    Object.keys(methods).forEach(function(methodName) {
      var onCompleteArgIndex = methods[methodName];
      var wrappedMethod = target[methodName];
      target[methodName] = function() {
        var onComplete = arguments[onCompleteArgIndex];
        var hasOnComplete = typeof onComplete === 'function' || typeof onComplete === 'undefined';
        if (typeof onComplete !== 'function') onComplete = noop;
        var args = Array.prototype.slice.call(arguments);
        var ref = this;
        var timeouts;
        if (isWrite) {
          timeouts = slowWriteCallbackRecords.map(function(record) {
            var timeout = {counted: false, record: record};
            timeout.handle = setTimeout(function() {
              timeout.counted = true;
              timeout.record.callback(++timeout.record.count);
            }, record.timeout);
            return timeout;
          });
        }
        var wrappedOnComplete = function(error) {
          if (isWrite) {
            timeouts.forEach(function(timeout) {
              clearTimeout(timeout.handle);
              if (timeout.counted) timeout.record.callback(--timeout.record.count);
            });
          }
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
      createUser: 1, changeEmail: 1, changePassword: 1, removeUser: 1, resetPassword: 1
    });
    wrapOnComplete(Firebase.prototype, {
      set: 1, update: 1, setWithPriority: 2, setPriority: 1, transaction: 1,
      // 'remove' and 'push' delegate to 'set'; 'on' and 'once' will be wrapped by wrapQuery below
    }, true);
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
