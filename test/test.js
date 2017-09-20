var fs = require('fs-extra');
var path = require('path');
var mvn = require('../index');
var REMOVE_M2_DIR_AFTER_EACH_TEST = true;

describe('maven', function() {
  var localRepository = path.join(__dirname, '.m2');
  console.log('local repo', localRepository);
  beforeEach(cleanUpM2Dir);
  afterEach(cleanUpM2Dir);
  testJson('com.j256.ormlite_ormlite-jdbc_4.48.json');
  testJson('org.apache.lucene_lucene-core_4.9.0.json');
  testJson('org.jboss.weld_weld-osgi-bundle_1.1.4.Final.json');
  testJson('com.amazonaws_aws-apigateway-importer_1.0.1.json');
  testJson('org.apache.pdfbox_pdfbox_1.8.10.json');
  testJson('org.springframework_spring_2.0.6.json');
  testJson('com.googlecode.netlib-java.netlib-java.json');

  function testJson(jsonPath) {
    it('should pull the maven dependencies for ' + jsonPath, function(done) {
      this.timeout(120 * 1000);
      var opts = {
        localRepository: localRepository, 
        packageJsonPath: path.join(__dirname, jsonPath)
      };
      mvn(opts, function(err, mvnResults) {
        if (err) {
          done(err);
          return console.error('could not resolve maven dependencies', err);
        }
        done();
      });
    });
  }
  
  function cleanUpM2Dir(done) {
    if (REMOVE_M2_DIR_AFTER_EACH_TEST) {
      fs.remove(localRepository, done);
    } else {
      done();
    }
  }
});
