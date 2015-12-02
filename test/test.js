var fs = require('fs-extra')
  , path = require('path')
  , mvn = require('../index');

describe('maven', function() {
  var localRepository = path.join(__dirname, '.m2');
  console.log('local repo', localRepository);
  beforeEach(function(done) {
    fs.remove(localRepository, done);
  });
  afterEach(function(done) {
    fs.remove(localRepository, done);
  });
  it('should pull the maven dependencies for ormlite-jdbc 4.48', function(done) {
    this.timeout(15000);
    mvn({localRepository: localRepository, packageJsonPath: __dirname+'/ormlite-jdbc-package.json'}, function(err, mvnResults) {
      if (err) {
        done(err);
        return console.error('could not resolve maven dependencies', err);
      }
      done();
    });
  });
  it('should pull the maven dependencies for lucene-core 4.9.0', function(done) {
    this.timeout(15000);
    mvn({localRepository: localRepository, packageJsonPath: __dirname+'/lucene-core-package.json'}, function(err, mvnResults) {
      if (err) {
        done(err);
        return console.error('could not resolve maven dependencies', err);
      }
      done();
    });
  });
});
