module.exports = function(config) {
  config.set({
    'basePath': '../',
    'frameworks': ['jasmine'],
    'files': [
      'bower_components/promise-polyfill/Promise.js',
      'bower_components/firebase/firebase.js',
      'src/**/*.js',
      'test/**/*.spec.js'
    ],
    'browsers': ['PhantomJS']
  });
};
