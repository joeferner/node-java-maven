var fs = require('fs-extra');
var path = require('path');
var mvn = require('../index');

describe('maven', function() {
  var localRepository = path.join(__dirname, '.m2');
  console.log('local repo', localRepository);
  beforeEach(function(done) {
    fs.remove(localRepository, done);
  });
  afterEach(function(done) {
    fs.remove(localRepository, done);
  });
  testJson('com.j256.ormlite_ormlite-jdbc_4.48.json');
  testJson('org.apache.lucene_lucene-core_4.9.0.json');
  testJson('org.jboss.weld_weld-osgi-bundle_1.1.4.Final.json');
  //testJson('com.amazonaws_aws-apigateway-importer_1.0.1.json');
  testJson('org.apache.pdfbox_pdfbox_1.8.10.json');
  
  function testJson(jsonPath) {
    it('should pull the maven dependencies for ' + jsonPath, function(done) {
      this.timeout(60 * 1000);
      mvn({localRepository: localRepository, packageJsonPath: path.join(__dirname, jsonPath)}, function(err, mvnResults) {
        if (err) {
          done(err);
          return console.error('could not resolve maven dependencies', err);
        }
        done();
      });
    });
  }
});
