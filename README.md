[![Build Status](https://travis-ci.org/joeferner/node-java-maven.svg)](https://travis-ci.org/joeferner/node-java-maven)
[![npm version](https://badge.fury.io/js/node-java-maven.svg)](https://badge.fury.io/js/node-java-maven)

node-java-maven
---------------

* Install node-java-maven

        npm install node-java-maven
        
* Add a java key to your package.json

        {
          "java": {
            "dependencies": [
              {
                "groupId": "org.apache.lucene",
                "artifactId": "lucene-core",
                "version": "4.9.0"
              }
            ]
          }
        }
        
* Run node-java-maven

        ./node_modules/.bin/node-java-maven
        
* Use [node-java](https://github.com/joeferner/node-java) with node-java-maven to set your classpath

        var java = require('java');
        var mvn = require('node-java-maven');

        mvn(function(err, mvnResults) {
          if (err) {
            return console.error('could not resolve maven dependencies', err);
          }
          mvnResults.classpath.forEach(function(c) {
            console.log('adding ' + c + ' to classpath');
            java.classpath.push(c);
          });
          
          var Version = java.import('org.apache.lucene.util.Version');
        });

* Exclusions dependencies with "exclusions" property

        {
          "java": {
            "exclusions": [
              {
                "groupId": "javax.activation",
                "artifactId": "activation"
              },
              {
                "groupId": "javax.ejb",
                "artifactId": "ejb"
              },
              {
                "groupId": "javax.faces",
                "artifactId": "jsf-api"
              },
              {
                "groupId": "javax.jms",
                "artifactId": "jms"
              },
              {
                "groupId": "javax.mail",
                "artifactId": "mail"
              }
            ],
            "dependencies": [
              {
                "groupId": "org.springframework",
                "artifactId": "spring",
                "version": "2.0.6"
              }
            ]
          }
        }

* Add another maven repo

        {
          "java": {
            "repositories": [
              {
                "id": "maven",
                "url": "http://example/repository/maven-public/",
                "credentials": {
                  "username": "user",
                  "password": "pass"
                }
              }
            ],
            "dependencies": [
              {
                "groupId": "org.apache.lucene",
                "artifactId": "lucene-core",
                "version": "4.9.0"
              }
            ]
          }
        }
