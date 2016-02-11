// This is the function of the view _design/versions
// It is used to normalize the versions on the database so it can be used by
// semver


var require: Function;
var npa = require('npm-package-arg');


type Dependencies = {[dependency: string]: string}
type Versions = {[version: string]: Version};


interface Version{
    name: string;
    version: string;
    description: string;
    dependencies: Dependencies;
    license?: string;
}


interface Doc{
    _id: string;
    _rev: string;
    name: string;
    description: string;
    versions: Versions;
}


type VersionsOutput = {version: string, license: string}[]

declare var emit: Function;
declare var doc_couchdb: Doc;



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
            version: key,
            license: license,
            number: index + 1
        };
        only_versions.push(output);
        index++;
    }

    emit(doc, only_versions);
}

map();
