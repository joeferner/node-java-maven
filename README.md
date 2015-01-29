
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

        ./node_modules/node-java-maven/bin/node-java-maven
        
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
