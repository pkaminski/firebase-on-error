describe('Firebase', function() {
  'use strict';
  var fb;
  var simulatorToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzaW11bGF0ZSI6dHJ1ZSwiZGVidWciOnRydWUsInYiOjAsImQiOnsidWlkIjoidGVzdCJ9LCJpYXQiOjE0NTgyOTcyOTR9.mWY_83jcMcome_9Dz-Yg9Ms4dpswaFIvp869T9EmZeU';
  function noop() {}

  beforeEach(function() {
    fb = new Firebase('https://altfire-test.firebaseio.com/');
  });

  describe('onError', function() {
    var globalCallback;

    beforeEach(function() {
      globalCallback = null;
    });

    afterEach(function(done) {
      if (globalCallback) Firebase.offError(globalCallback);
      fb.child('forbidden').off();
      // Wait until the cancellation is done, otherwise it can interfere with callbacks in the next
      // test.
      fb.child('forbidden').onDisconnect().cancel(done);
    });

    it('should not invoke error callback when no error occurred', function(done) {
      globalCallback = Firebase.onError(function() {
        expect(true).toBe(false);
      });
      fb.child('allowed').set(true, function(error) {
        expect(error).toBeNull();
        done();
      });
    });

    it('should intercept auth errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.auth('');
    });

    it('should intercept auth errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.auth('', errorCallback);
    });

    it('should intercept authWithCustomToken errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.authWithCustomToken('');
    });

    it('should intercept authWithCustomToken errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.authWithCustomToken('', errorCallback);
    });

    it('should intercept authAnonymously errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.authAnonymously();
    });

    it('should intercept authAnonymously errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.authAnonymously(errorCallback);
    });

    it('should intercept authWithPassword errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.authWithPassword({email: 'foo@example.com', password: 'bar'});
    });

    it('should intercept authWithPassword errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.authWithPassword({email: 'foo@example.com', password: 'bar'}, errorCallback);
    });

    it('should intercept authWithOAuthPopup errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.authWithOAuthPopup('twitter');
    });

    it('should intercept authWithOAuthPopup errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.authWithOAuthPopup('twitter', errorCallback);
    });

    // Can't test authWithOAuthRedirect

    it('should intercept authWithOAuthToken errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.authWithOAuthToken('twitter', '');
    });

    it('should intercept authWithOAuthToken errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.authWithOAuthToken('twitter', '', errorCallback);
    });

    it('should intercept set errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').set(false);
    });

    it('should intercept set errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.child('forbidden').set(false, errorCallback);
    });

    it('should ignore errors if callback returns IGNORE_ERROR', function(done) {
      globalCallback = Firebase.onError(function() {
        throw new Error('onError invoked');
      });
      fb.child('forbidden').set(false, function() {
        done();
        return Firebase.IGNORE_ERROR;
      });
    });

    it('should intercept update errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden/foo').update({bar: false});
    });

    it('should intercept update errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function(error) {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.child('forbidden/foo').update({bar: false}, errorCallback);
    });

    it('should intercept remove errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').remove();
    });

    it('should intercept remove errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.child('forbidden').remove(errorCallback);
    });

    it('should intercept push errors', function(done) {
      globalCallback = Firebase.onError(done);
      expect(fb.child('forbidden').push(42)).toEqual(jasmine.any(Firebase));
    });

    it('should intercept push errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      expect(fb.child('forbidden').push(42, errorCallback)).toEqual(jasmine.any(Firebase));
    });

    it('should do nothing on empty push', function() {
      expect(fb.child('forbidden').push()).toEqual(jasmine.any(Firebase));
    });

    it('should intercept setWithPriority errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').setWithPriority(false, 42);
    });

    it('should intercept setWithPriority errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.child('forbidden').setWithPriority(false, 42, errorCallback);
    });

    it('should intercept setPriority errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').setPriority(42);
    });

    it('should intercept setPriority errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.child('forbidden').setPriority(42, errorCallback);
    });

    it('should intercept transaction errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').transaction(function() {return null;});
    });

    it('should intercept transaction errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        // When using firebase-debug.js, transaction() also calls on(), which gets intercepted too
        // and signals its own global error first.  We ignore everything until the errorCallback has
        // been invoked -- at worst, the test will time out.
        if (!errorCallback.calls.any()) return;
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.child('forbidden').transaction(function() {return null;}, errorCallback);
    });

    // TODO: test user/password methods

    it('should intercept on errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').on('value', noop);
    });

    it('should intercept on errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.child('forbidden').on('value', noop, errorCallback);
    });

    it('should intercept on errors after startAt', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').startAt().on('value', noop);
    });

    it('should intercept on errors after endAt', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').endAt().on('value', noop);
    });

    it('should intercept on errors after equalTo', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').equalTo(null).on('value', noop);
    });

    it('should intercept on errors after orderByChild', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').orderByChild('foo').on('value', noop);
    });

    it('should intercept on errors after orderByKey', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').orderByKey().on('value', noop);
    });

    it('should intercept on errors after orderByValue', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').orderByValue().on('value', noop);
    });

    it('should intercept on errors after orderByPriority', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').orderByPriority().on('value', noop);
    });

    it('should intercept on errors after limit', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').limit(1).on('value', noop);
    });

    it('should intercept on errors after limitToFirst', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').limitToFirst(1).on('value', noop);
    });

    it('should intercept on errors after limitToLast', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').limitToLast(1).on('value', noop);
    });

    it('should return once value', function(done) {
      globalCallback = Firebase.onError(function() {
        expect(true).toBe(false);
      });
      fb.child('allowed').once('value', function(snap) {
        done();
      });
    });

    it('should return once promise', function(done) {
      globalCallback = Firebase.onError(function(error) {
        expect(true).toBe(false);
      });
      fb.child('allowed').once('value').then(function(snap) {
        done();
      });
    });

    it('should intercept once errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').once('value', noop);
    });

    it('should intercept once errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy('errorCallback');
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.child('forbidden').once('value', noop, errorCallback);
    });

    it('should intercept once errors after startAt', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').startAt().once('value', noop);
    });

    it('should intercept once errors after endAt', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').endAt().once('value', noop);
    });

    it('should intercept once errors after equalTo', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').equalTo(null).once('value', noop);
    });

    it('should intercept once errors after orderByChild', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').orderByChild('foo').once('value', noop);
    });

    it('should intercept once errors after orderByKey', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').orderByKey().once('value', noop);
    });

    it('should intercept once errors after orderByValue', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').orderByValue().once('value', noop);
    });

    it('should intercept once errors after orderByPriority', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').orderByPriority().once('value', noop);
    });

    it('should intercept once errors after limit', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').limit(1).once('value', noop);
    });

    it('should intercept once errors after limitToFirst', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').limitToFirst(1).once('value', noop);
    });

    it('should intercept once errors after limitToLast', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').limitToLast(1).once('value', noop);
    });

    it('should intercept onDisconnect.set errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').onDisconnect().set(false);
    });

    it('should intercept onDisconnect.set errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy('errorCallback');
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.child('forbidden').onDisconnect().set(false, errorCallback);
    });

    it('should intercept onDisconnect.setWithPriority errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').onDisconnect().setWithPriority(false, 42);
    });

    it('should intercept onDisconnect.setWithPriority errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy('errorCallback');
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.child('forbidden').onDisconnect().setWithPriority(false, 42, errorCallback);
    });

    it('should intercept onDisconnect.update errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').onDisconnect().update({foo: false});
    });

    it('should intercept onDisconnect.update errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy('errorCallback');
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.child('forbidden').onDisconnect().update({foo: false}, errorCallback);
    });

    it('should intercept onDisconnect.remove errors', function(done) {
      globalCallback = Firebase.onError(done);
      fb.child('forbidden').onDisconnect().remove();
    });

    it('should intercept onDisconnect.remove errors with a user callback', function(done) {
      var errorCallback = jasmine.createSpy('errorCallback');
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        done();
      });
      fb.child('forbidden').onDisconnect().remove(errorCallback);
    });

    // I couldn't find a way to cause onDisconnect().cancel() to trigger an error.
    it('should not affect onDisconnect.cancel', function(done) {
      var errorCallback = jasmine.createSpy('errorCallback');
      globalCallback = Firebase.onError(errorCallback);
      fb.child('forbidden').onDisconnect().cancel(done);
    });

    it('should be able to debug permission denied errors on write calls', function(done) {
      Firebase.debugPermissionDeniedErrors(function(uid) {
        return {then: function(fn) {return fn(simulatorToken);}};
      });
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        expect(errorCallback.calls.argsFor(0)[0].extra.debug).toMatch(/Write was denied/);
        Firebase.debugPermissionDeniedErrors(null);
        done();
      });
      fb.child('forbidden').set(false, errorCallback);
    });

    it('should be able to debug permission denied errors on on calls', function(done) {
      Firebase.debugPermissionDeniedErrors(function(uid) {
        return {then: function(fn) {return fn(simulatorToken);}};
      });
      var errorCallback = jasmine.createSpy();
      globalCallback = Firebase.onError(function() {
        expect(errorCallback).toHaveBeenCalled();
        expect(errorCallback.calls.argsFor(0)[0].extra.debug).toMatch(/Read was denied/);
        Firebase.debugPermissionDeniedErrors(null);
        done();
      });
      fb.child('forbidden').on('value', noop, errorCallback);
    });

  });
});
