module.exports = function(grunt) {

  grunt.initConfig({
    // Testing
    karma: {
      unit: {
        configFile: 'test/karma.conf.js'
      }
    }
  });

  // Load all available grunt plugins from package.json
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  // The tasks
  grunt.registerTask('test', ['karma']);
};
