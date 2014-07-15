'use strict';

var fs = require('fs');
var async = require('async');
var xml2js = require('xml2js');
var request = require('request');
var path = require('path');
var mkdirp = require('mkdirp');

module.exports = function(options, callback) {
  options = options || {};
  options.baseUrl = options.baseUrl || 'http://central.maven.org/maven2/';
  options.javaModulesPath = options.javaModulesPath || path.join(process.cwd(), 'java_modules');

  var dependencies = [];
  var errors = [];

  var dependencyQueue = async.queue(processDependency, 1);
  dependencyQueue.drain = function() {
    if (errors.length > 0) {
      return callback(errors);
    }
    var classpath = getClasspathFromDependencies(dependencies);
    return callback(null, {
      classpath: classpath,
      dependencies: dependencies
    });
  };

  return readPackageJson(function(err, packageJson) {
    if (err) {
      return callback(err);
    }

    if (!packageJson.java.dependencies) {
      return callback(new Error("Could not find java.dependencies property in package.json"));
    }

    return packageJson.java.dependencies.forEach(function(d) {
      dependencyQueuePush(d);
    });
  });

  /***************************************************************************************/

  function dependencyQueuePush(dependency) {
    // TODO make sure this dependency isn't already in the tasks list
    dependencyQueue.push(dependency);
  }

  function findDependencyInDependencyList(dependency, dependencyList) {
    dependencyList = dependencyList || dependencies;
    for (var i = 0; i < dependencyList.length; i++) {
      var d = dependencyList[i];
      if (
        dependency.groupId == d.groupId
          && dependency.artifactId == d.artifactId
          && dependency.version == d.version) {
        return d;
      }
    }
    return null;
  }

  function processDependency(dependency, callback) {
    return resolveDependency(dependency, function(err, resolvedDependency) {
      if (err) {
        errors.push(err);
        return callback(err);
      }
      dependencies.push(resolvedDependency);
      return callback();
    });
  }

  function getClasspathFromDependencies(dependencyTree) {
    var classpath = [];
    dependencyTree.forEach(function(dep) {
      if (dep.jarPath) {
        classpath.push(dep.jarPath);
      }
      if (dep.dependencies) {
        classpath = classpath.concat(getClasspathFromDependencies(dep.dependencies));
      }
    });
    return classpath;
  }

  function resolveVersion(currentDependency, dependency) {
    if (currentDependency.xml && currentDependency.xml.project && currentDependency.xml.project.dependencyManagement) {
      var dependencyManagement = currentDependency.xml.project.dependencyManagement[0];
      if (dependencyManagement.dependencies) {
        var dependencyManagementDependencies = dependencyManagement.dependencies[0].dependency;
        for (var i = 0; i < dependencyManagementDependencies.length; i++) {
          var d = dependencyManagementDependencies[i];
          if (d.groupId[0] == '${project.groupId}') {
            d.groupId[0] = currentDependency.xml.project.groupId[0];
          }

          if (dependency.groupId == d.groupId[0] && dependency.artifactId == d.artifactId[0]) {
            var version = d.version[0];
            if (version == '${project.version}') {
              if (currentDependency.xml.project.version) {
                version = currentDependency.xml.project.version[0];
              } else {
                console.error('could not find project.version in ' + currentDependency.groupId + ':' + currentDependency.artifactId);
                return null;
              }
            }
            return version;
          }
        }
      }
    } else if (currentDependency.parent) {
      return resolveVersion(findDependencyInDependencyList(currentDependency.parent) || currentDependency.parent, dependency);
    }
    return null;
  }

  function resolveDependency(dependency, callback) {
    if (!dependency.groupId) {
      return callback(new Error('dependency missing groupId: ' + JSON.stringify(dependency)));
    }
    if (!dependency.artifactId) {
      return callback(new Error('dependency missing artifactId: ' + JSON.stringify(dependency)));
    }
    if (!dependency.version) {
      return callback(new Error('dependency missing version: ' + JSON.stringify(dependency)));
    }

    var foundDependency = findDependencyInDependencyList(dependency);
    if (foundDependency) {
      return callback(null, foundDependency);
    }

    console.log('resolving: ' + dependency.groupId + ':' + dependency.artifactId + ':' + dependency.version);
    return resolvePom(dependency, function(err, dependency) {
      if (err) {
        return callback(err);
      }
      if (dependency.packaging == 'pom') {
        return callback(null, dependency);
      }
      return resolveJar(dependency, callback);
    });
  }

  // http://central.maven.org/maven2/org/apache/lucene/lucene-core/4.9.0/lucene-core-4.9.0.pom
  function resolvePom(dependency, callback) {
    var groupPath = getGroupPath(dependency);
    var pomDir = getPomDir(dependency);
    var pomFilename = dependency.artifactId + '-' + dependency.version + '.pom';
    var pomPath = path.join(pomDir, pomFilename);
    dependency.pomPath = pomPath;

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
      var url = options.baseUrl + groupPath + '/' + dependency.artifactId + '/' + dependency.version + '/' + pomFilename;
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

        dependency.xml = xml;

        if (xml && xml.project && xml.project.packaging) {
          dependency.packaging = xml.project.packaging[0];
        } else {
          dependency.packaging = dependency.packaging || 'jar';
        }

        if (xml && xml.project && xml.project.parent) {
          var parent = xml.project.parent[0];
          dependency.parent = {
            groupId: parent.groupId[0],
            artifactId: parent.artifactId[0],
            version: parent.version[0]
          };
          return processDependency(dependency.parent, function(err) {
            if (err) {
              return callback(err);
            }
            addDependencies(xml, dependency);
            return callback(null, dependency);
          });
        } else {
          addDependencies(xml, dependency);
          return callback(null, dependency);
        }
      });

      function addDependencies(xml, dependency) {
        if (xml && xml.project && xml.project.dependencies) {
          xml.project.dependencies.forEach(function(dep) {
            (dep.dependency || []).forEach(function(d) {
              if (d.scope && d.scope[0] == 'test') {
                return;
              }

              if (d.groupId[0] == '${project.groupId}') {
                d.groupId[0] = dependency.xml.project.groupId[0];
              }
              if (d.version && d.version[0] == '${project.version}') {
                d.version[0] = dependency.xml.project.version[0];
              }

              var childDependency = {
                groupId: d.groupId[0],
                artifactId: d.artifactId[0],
                version: d.version ? d.version[0] : null
              };
              if (!childDependency.version) {
                childDependency.version = resolveVersion(dependency, childDependency);
                if (!childDependency.version) {
                  if (childDependency.groupId == dependency.groupId) {
                    childDependency.version = dependency.version;
                  }
                  if (!childDependency.version) {
                    errors.push(new Error('Could not find version for ' + childDependency.groupId + ':' + childDependency.artifactId + ' for parent ' + dependency.groupId + ':' + dependency.artifactId));
                    return;
                  }
                }
              }
              dependencyQueuePush(childDependency);
            });
          });
        }
      }
    }
  }

  function resolveJar(dependency, callback) {
    var groupPath = getGroupPath(dependency);
    var pomDir = getPomDir(dependency);
    var jarFilename = dependency.artifactId + '-' + dependency.version + '.jar';
    var jarPath = path.join(pomDir, jarFilename);
    dependency.jarPath = jarPath;

    return fs.exists(jarPath, function(exists) {
      if (exists) {
        return callback(null, dependency);
      } else {
        return downloadJar();
      }
    });

    function downloadJar() {
      var url = options.baseUrl + groupPath + '/' + dependency.artifactId + '/' + dependency.version + '/' + jarFilename;
      console.log('downloading: ' + url);
      return mkdirp(pomDir, function(err) {
        if (err) {
          return callback(err);
        }
        var stream = fs.createWriteStream(jarPath);

        stream.on('finish', function() {
          return callback(null, dependency);
        });
        stream.on('error', function(err) {
          return callback(err);
        });

        return request(url).pipe(stream);
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

  function getPomDir(dependency) {
    var groupPath = getGroupPath(dependency);
    return path.join(options.javaModulesPath, groupPath, dependency.artifactId, dependency.version)
  }

  function getGroupPath(dependency) {
    return dependency.groupId.replace(/\./g, '/');
  }
};
