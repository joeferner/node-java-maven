var java = require('java')
  , mvn = require('../index');

describe('maven', function() {
  it('should pull the maven dependencies for ormlite-jdbc 4.48', function(done) {
    mvn({debug: true, packageJsonPath: __dirname+'/ormlite-package.json'}, function(err, mvnResults) {
      if (err) {
        done(err);
        return console.error('could not resolve maven dependencies', err);
      }
      mvnResults.classpath.forEach(function(c) {
        console.log('adding ' + c + ' to classpath');
        java.classpath.push(c);
      });
      self.initialized = true;
      console.log('done');
      done();
    });
  });
});
