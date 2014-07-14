'use strict';

var fs = require('fs');
var async = require('async');
var xml2js = require('xml2js');
var request = require('request');
var path = require('path');
var mkdirp = require('mkdirp');

module.exports = function(callback) {
  return readPackageJson(function(err, packageJson) {
    if (err) {
      return callback(err);
    }

    if (!packageJson.java.dependencies) {
      return callback(new Error("Could not find java.dependencies property in package.json"));
    }

    var paths = [];
    var errors = [];
    var q = async.queue(function(dependency, callback) {
      return resolveDependency(q, dependency, function(err, paths) {
        if (err) {
          errors.push(err);
          return callback(err);
        }
        console.log(paths);
      });
    }, 5);
    q.drain = function() {
      if (errors.length > 0) {
        return callback(errors);
      }
      return callback();
    };

    packageJson.java.dependencies.forEach(function(d) {
      q.push(d);
    });
  });
};

function resolveDependency(dependencyQueue, dependency, callback) {
  if (!dependency.groupId) {
    return callback(new Error('dependency missing groupId: ' + JSON.stringify(dependency)));
  }
  if (!dependency.artifactId) {
    return callback(new Error('dependency missing artifactId: ' + JSON.stringify(dependency)));
  }
  if (!dependency.version) {
    return callback(new Error('dependency missing version: ' + JSON.stringify(dependency)));
  }

  console.log('resolving: ' + dependency.groupId + ':' + dependency.artifactId + ':' + dependency.version);
  return resolvePom(dependencyQueue, dependency, callback);
}

// http://central.maven.org/maven2/org/apache/lucene/lucene-core/4.9.0/lucene-core-4.9.0.pom
function resolvePom(dependencyQueue, dependency, callback) {
  var groupPath = dependency.groupId.replace(/\./g, '/');
  var pomDir = path.join(process.cwd(), 'java_modules', groupPath, dependency.artifactId, dependency.version);
  var pomFilename = dependency.artifactId + '-' + dependency.version + '.pom';
  var pomPath = path.join(pomDir, pomFilename);
  return fs.exists(pomPath, function(exists) {
    if (exists) {
      return loadFile();
    } else {
      return downloadPom();
    }
  });

  function loadFile() {
    return fs.readFile(pomPath, 'utf8', function(err, data) {
      if (err) {
        return callback(err);
      }
      return processPom(data);
    });
  }

  function downloadPom() {
    var url = 'http://central.maven.org/maven2/' + groupPath + '/' + dependency.artifactId + '/' + dependency.version + '/' + pomFilename;
    console.log('downloading: ' + url);
    return request(url, function(err, data) {
      if (err) {
        return callback(err);
      }
      var body = data.body;
      return mkdirp(pomDir, function(err) {
        if (err) {
          return callback(err);
        }
        return fs.writeFile(pomPath, body, function(err) {
          if (err) {
            return callback(err);
          }
          return processPom(body);
        });
      });
    });
  }

  function processPom(data) {
    return xml2js.parseString(data, function(err, xml) {
      if (err) {
        return callback(err);
      }
      // TODO load dependencies
      // console.log(xml);
    });
  }
}

function readPackageJson(callback) {
  return fs.readFile('package.json', 'utf8', function(err, packageJsonString) {
    if (err) {
      return callback(err);
    }
    try {
      var packageJson = JSON.parse(packageJsonString);
    } catch (ex) {
      return callback(ex);
    }

    if (!packageJson.java) {
      return callback(new Error("Could not find java property in package.json"));
    }

    return callback(null, packageJson);
  });
}
