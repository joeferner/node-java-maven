'use strict';

var path = require('path');

function Dependency() {
}

Dependency.prototype.toString = function() {
  return this.groupId + ':' + this.artifactId + ':' + this.version;
};

Dependency.prototype.getGroupPath = function() {
  return this.groupId.replace(/\./g, '/');
};

Dependency.prototype.getArtifactPath = function() {
  return path.join(this.getGroupPath(), this.artifactId);
};

Dependency.prototype.getVersionPath = function() {
  if (!this.version) {
    throw new Error('version not found for ' + this.toString());
  }
  return path.join(this.getArtifactPath(), this.version);
};

Dependency.prototype.getPomPath = function() {
  return path.join(this.getVersionPath(), this.getPomFileName());
};

Dependency.prototype.getJarPath = function() {
  return path.join(this.getVersionPath(), this.getJarFileName());
};

Dependency.prototype.getJarFileName = function() {
  return this.artifactId + '-' + this.version + ( this.classifier ? '-' + this.classifier : '' ) + '.jar';
};

Dependency.prototype.getPomFileName = function() {
  return this.artifactId + '-' + this.version + '.pom';
};

Dependency.prototype.getPackaging = function() {
  if (!this.pomXml) {
    throw new Error('Could not find pomXml for dependency: ' + this.toString());
  }
  if (this.pomXml.project && this.pomXml.project.packaging) {
    return this.pomXml.project.packaging[0];
  } else {
    return 'jar';
  }
};

Dependency.prototype.getParent = function() {
  if (!this.pomXml || !this.pomXml.project) {
    throw new Error("Invalid dependency state. Missing pomXml. " + this);
  }
  if (this.pomXml.project.parent) {
    var p = this.pomXml.project.parent[0];
    return Dependency.createFromXmlObject(p, this.reason);
  }
  return null;
};

Dependency.prototype.getDependencies = function() {
  if (
    this.pomXml.project
    && this.pomXml.project.dependencies
    && this.pomXml.project.dependencies[0]
    && this.pomXml.project.dependencies[0].dependency) {
    var reason = this.reason;
    if (reason) {
      reason += '/';
    }
    reason += this.toString();
    var dependencies = this.pomXml.project.dependencies[0].dependency;
    return dependencies.map(function(d) {
      return Dependency.createFromXmlObject(d, reason);
    });
  }
  return [];
};

Dependency.prototype.getDependencyManagementDependencies = function() {
  if (
    this.pomXml.project
    && this.pomXml.project.dependencyManagement
    && this.pomXml.project.dependencyManagement[0]
    && this.pomXml.project.dependencyManagement[0].dependencies
    && this.pomXml.project.dependencyManagement[0].dependencies[0]
    && this.pomXml.project.dependencyManagement[0].dependencies[0].dependency) {
    var reason = this.reason;
    if (reason) {
      reason += '/';
    }
    reason += this.toString();

    var dependencies = this.pomXml.project.dependencyManagement[0].dependencies[0].dependency;
    return dependencies.map(function(d) {
      return Dependency.createFromXmlObject(d, reason);
    });
  }
  return [];
};

Dependency.prototype.markCompleted = function() {
  this.complete = true;
};

// this is a hack to wait for in flight dependencies to complete
Dependency.prototype.waitUntilComplete = function(callback) {
  callback = callback || function() {};
  var me = this;
  var count = 0;
  var wait = setInterval(function() {
    if (me.complete) {
      clearInterval(wait);
      if (!callback) {
        return false;
      }
      var cb = callback;
      callback = null;
      return cb();
    }

    count++;
    if (count > 100) {
      console.log('waiting for ' + me.toString() + ' [state: ' + me.state + ']');
      count = 0;
    }

    return false;
  }, 10);
};

Dependency.createFromObject = function(obj, reason) {
  var result = new Dependency();
  result.reason = reason;
  Object.keys(obj).forEach(function(k) {
    result[k] = obj[k];
  });
  return result;
};

Dependency.createFromXmlObject = function(xml, reason) {
  return Dependency.createFromObject({
    groupId: xml.groupId[0],
    artifactId: xml.artifactId[0],
    classifier: xml.classifier && xml.classifier[0],
    version: xml.version ? xml.version[0] : null,
    scope: xml.scope ? xml.scope[0] : 'compile',
    optional: xml.optional ? (xml.optional[0] == 'true') : false
  }, reason);
};

module.exports = Dependency;
