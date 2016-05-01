/// <reference path="couchdb_common.ts"/>


// This is the function of the view _design/versions
// It is used to normalize the versions on the database so it can be used by
// semver


var require: Function;
var npa = require('npm-package-arg');


function fix_version(version: string){
    var to_check = "x@" + version;
    return npa(to_check).spec;
}

function fix_deps(deps){
    var n = {};
    for(var key in deps){
      var element = deps[key];
      n[key] = {
        fixed: fix_version(element),
        original: element
      }
    }
    return n;
}


function map(){
    var doc = doc_couchdb;
    var versions = {};
    for(var key in doc.versions){
        var version: Version = doc.versions[key];
        var license: string;

        if(version.license){
            license = version.license;
        }else{
            license = "not defined";
        }

        var output = {
            license: license,
            description: version.description,
            dependencies: fix_deps(version.dependencies),
            dist: version.dist,
            maintainers: version.maintainers,
            repository: version.repository,
            scripts: version.scripts,
            bin: version.bin
        };
        versions[fix_version(key)] = output;
    }

    emit(doc["_id"], versions);
}

map();
