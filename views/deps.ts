/// <reference path="couchdb_common.ts"/>
// view _design/deps


function map(){
    var doc = doc_couchdb;

    var versions = doc.versions;
    var d = {};
    for(var key in versions){
        var deps = versions[key]["dependencies"];
        if(deps !== undefined){
            d[key] = deps;
        }else{
            d[key] = [];
        }
    }

    emit(doc["name"], d);
}

map();
