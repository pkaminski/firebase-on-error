(function() {
  'use strict';

  var glob = typeof global !== 'undefined' ? global : window;
  Firebase.IGNORE_ERROR = function() {return Firebase.IGNORE_ERROR;};  // unique marker object
  var errorCallbacks = [], slowWriteCallbackRecords = [], writeCounter = 0;
  var simulatedTokenGeneratorFn, maxSimulationDuration = 5000, simulationQueue, simulationFilter;
  var consoleLogs = [], consoleIntercepted = false;
  var interceptInPlace = false;

  /**
   * Registers a global callback that will be invoked whenever any Firebase API indicates that an
   * error occurred, unless your onComplete function for that call returns (or is) IGNORE_ERROR.
   * Errors that occur on calls made before the first callback is registered will not be captured.
   * @param  {Function} callback The function to call back when an error occurs.  It will be passed
   *     the Firebase Error, the reference (or query or onDisconnect instance), the method name, and
   *     the arguments passed to the Firebase function call as arguments.  The error will be
   *     augmented with additional information in the `extra` property.
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
   *     changes.  The arguments to the callback are the current count, +1 or -1 to indicate whether
   *     the count was just incremented or decremented, and a short description of the stalled call.
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

  /**
   * Requests that extra debugging information be provided for permission denied errors.  This works
   * by obtaining a special auth token (via the callback) that sets the simulated and debug flags,
   * and reissuing the failing request on a separate connection, then recording the debug
   * information that Firebase sends back.
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
      simulatedTokenGenerator, maxSimulatedCallDuration, callFilter) {
    interceptErrorCallbacks();
    simulatedTokenGeneratorFn = simulatedTokenGenerator;
    if (maxSimulatedCallDuration) maxSimulationDuration = maxSimulatedCallDuration;
    simulationFilter = callFilter || function() {return true;};
    if (!consoleIntercepted) {
      var originalLog = console.log;
      console.log = function() {
        var message = Array.prototype.join.call(arguments, ' ');
        if (/^(FIREBASE: \n?)+/.test(message)) {
          message = message
            .replace(/^(FIREBASE: \n?)+/, '')
            .replace(/^\s+(.*?):\.(read|write|validate):.*/g, function(match, g1, g2) {
              return ' ' + g2 + ' ' + g1;
            });
          if (/^\s+/.test(message)) {
            var match = message.match(/^\s+=> (true|false)/);
            if (match) {
              consoleLogs[consoleLogs.length - 1] =
                (match[1] === 'true' ? '   ' : ' X ') + consoleLogs[consoleLogs.length - 1];
            } else {
              if (consoleLogs.length && /^\s+/.test(consoleLogs[consoleLogs.length - 1])) {
                consoleLogs.pop();
              }
              consoleLogs.push(message);
            }
          } else {
            consoleLogs.push(message);
          }
        } else {
          return originalLog.apply(console, arguments);
        }
      };
      consoleIntercepted = true;
    }
  };

  function wrapOnComplete(target, methods, isWrite) {
    Object.keys(methods).forEach(function(methodName) {
      var onCompleteArgIndex = methods[methodName];
      var wrappedMethod = target[methodName];
      target[methodName] = function() {
        var onComplete = arguments[onCompleteArgIndex];
        var hasOnComplete = typeof onComplete === 'function' || typeof onComplete === 'undefined';
        if (typeof onComplete !== 'function') onComplete = function() {};
        var args = Array.prototype.slice.call(arguments);
        var target = this;
        var ref = (target.ref ? target.ref() : target);
        var path = decodeURIComponent(
          ref.toString().slice(ref.root ? ref.root().toString().length - 1 : 0));
        var callDescription = methodName + '(' + path + ')';
        var simulationPromise;
        var timeouts;
        var writeSerial;
        if (isWrite) {
          writeSerial = writeCounter++;
          timeouts = slowWriteCallbackRecords.map(function(record) {
            var timeout = {counted: false, canceled: false, record: record};
            timeout.handle = setTimeout(function() {
              if (timeout.canceled) return;
              timeout.counted = true;
              timeout.record.callback(++timeout.record.count, 1, callDescription, writeSerial);
            }, record.timeout);
            return timeout;
          });
        }

        function wrappedOnComplete(error) {
          var callbackFinished = false, self = this, simulationTimeout;
          var onCompleteArgs = Array.prototype.slice.call(arguments);

          if (isWrite) {
            timeouts.forEach(function(timeout) {
              timeout.canceled = true;
              clearTimeout(timeout.handle);
              if (timeout.counted) {
                timeout.record.callback(--timeout.record.count, -1, callDescription, writeSerial);
              }
            });
          }

          if (error) {
            if (typeof error === 'string' || error instanceof String) {
              error = new Error(error);
            }
            var description = 'Firebase ' + callDescription + ': ' + error.message;
            var extra = {description: description, recoverable: error.recoverable};
            args.forEach(function(arg, i) {
              if (typeof arg === 'function') return;
              var value = '' + arg;
              if (arg !== null && typeof arg === 'object') {
                try {value = JSON.stringify(arg);} catch (e) {}
              }
              extra['arg_' + i] = value;
            });
            error.extra = extra;

            var code = error.code || error.message;
            if (glob.Promise && simulatedTokenGeneratorFn && maxSimulationDuration && code &&
                code.toLowerCase() === 'permission_denied' &&
                simulationFilter(target, methodName, args)) {
              simulationTimeout = setTimeout(function() {
                if (!error.extra.debug) error.extra.debug = 'Simulated call timed out';
                finishCallback();
              }, maxSimulationDuration);
              var auth = ref.getAuth();
              var simulatedFirebase;
              simulationPromise = Promise.resolve().then(function() {
                try {
                  return simulatedTokenGeneratorFn(auth && auth.uid || '');
                } catch (e) {
                  return Promise.reject(e);
                }
              }).then(function(token) {
                simulationQueue = (simulationQueue || Promise.resolve())
                  .catch(function() {})
                  .then(function() {
                    consoleLogs = [];
                    simulatedFirebase = new Firebase(
                      decodeURIComponent(target.toString()), 'firebase-on-error');
                    simulatedFirebase.unauth();
                    return simulatedFirebase.authWithCustomToken.original.call(
                      simulatedFirebase, token, function() {}, {remember: 'none'});
                  }).then(function() {
                    var simulatedMethod = methodName === 'on' ?
                      target.once.original || target.once : wrappedMethod;
                    var simulatedArgs = args.slice();
                    simulatedArgs[onCompleteArgIndex] = function() {};
                    return simulatedMethod.apply(simulatedFirebase, simulatedArgs)
                      .then(function() {
                        error.extra.debug =
                          'Unable to reproduce permission denied error in simulation';
                      }, function(e) {
                        var code = e.code || e.message;
                        if (code && code.toLowerCase() === 'permission_denied') {
                          error.extra.debug = consoleLogs.join('\n');
                        } else {
                          error.extra.debug = 'Got a different error in simulation: ' + e;
                        }
                      });
                  });
                return simulationQueue;
              }).then(function() {
                finishCallback();
              }, function(e) {
                error.extra.debug = 'Error running simulation: ' + e;
                finishCallback();
              }).then(function() {
                return Promise.reject(error);
              });
            }
          }

          if (!simulationTimeout) finishCallback();

          function finishCallback() {
            if (simulationTimeout) {
              clearTimeout(simulationTimeout);
              simulationTimeout = null;
            }
            if (callbackFinished) return;
            callbackFinished = true;
            var onCompleteCallbackResult = onComplete.apply(self, onCompleteArgs);
            if (error && onCompleteCallbackResult !== Firebase.IGNORE_ERROR) {
              errorCallbacks.forEach(function(callback) {
                callback(error, target, methodName, args);
              });
            }
          }
        }

        while (args.length < onCompleteArgIndex) args.push(void 0);
        args.splice(onCompleteArgIndex, hasOnComplete ? 1 : 0, wrappedOnComplete);
        var promise = wrappedMethod.apply(this, args);
        if (glob.Promise && promise && promise.catch) {
          promise = promise.catch(function(e) {
            if (simulationPromise) return simulationPromise;
            return Promise.reject(e);
          });
        }
        if (glob.Promise && promise && promise.then && !promise.finally) {
          var proto = Object.getPrototypeOf(promise);
          if (proto.then) {
            proto.finally = finallyPolyfill;
          } else {
            promise.finally = finallyPolyfill;
          }
        }
        return promise;
      };
      target[methodName].original = wrappedMethod;
    });
    return target;
  }

  function finallyPolyfill(callback) {
    return this.then(function(value) {
      return Promise.resolve(callback()).then(function() {return value;});
    }, function(error) {
      return Promise.resolve(callback()).then(function() {return Promise.reject(error);});
    });
  }

  function wrapPushDummyCallback(target) {
    var onCompleteArgIndex = 1;
    var wrappedMethod = target.push;
    target.push = function() {
      var args = Array.prototype.slice.call(arguments);
      var value = arguments[0];
      if (typeof value !== 'undefined' && value !== null) {
        var onComplete = arguments[onCompleteArgIndex];
        var hasOnComplete = typeof onComplete === 'function' || typeof onComplete === 'undefined';
        if (typeof onComplete !== 'function') onComplete = function() {};
        args.splice(onCompleteArgIndex, hasOnComplete ? 1 : 0, onComplete);
      }
      return wrappedMethod.apply(this, args);
    };
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
      // 'remove' delegates to 'set'; 'on' and 'once' will be wrapped by wrapQuery below
    }, true);
    // 'remove' and 'push' delegate to 'set', but we need to make sure to pass in a callback every
    // time so that the promise they return will have a dummy handler attached and won't raise a
    // top-level exception if there's an error.
    wrapPushDummyCallback(Firebase.prototype);
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
