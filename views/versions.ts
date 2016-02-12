/// <reference path="couchdb_common.ts"/>


// This is the function of the view _design/versions
// It is used to normalize the versions on the database so it can be used by
// semver


var require: Function;
var npa = require('npm-package-arg');

type VersionsOutput = {version: string, license: string}[]

function fix_version(version: string){
    var to_check = "x@" + version;
    return npa(to_check).spec;
}


function map(){
    var doc = doc_couchdb;
    var only_versions: VersionsOutput = [];
    var index = 0;
    for(var key in doc.versions){
        var version: Version = doc.versions[key];
        var license: string;

        if(version.license){
            license = version.license;
        }else{
            license = "not defined";
        }

        var output = {
            version: fix_version(key),
            license: license,
            number: index + 1
        };
        only_versions.push(output);
        index++;
    }

    emit(doc["_id"], only_versions);
}

map();
