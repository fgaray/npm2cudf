
declare var require: any;
declare var fs: any;

declare var process: any;



var nano = require('nano')("http://127.0.0.1:5984");
var _ = require('underscore')
var semver = require('semver')
var npa = require('npm-package-arg');

interface Database{
    insert: Function;
    db: Function;
    destroy: Function;
    get: Function;
    view: Function;
    bulk: Function;
}



var registry_dependencies: Database = nano.db.use("registry_dependencies");


function asyncView(db: Database, view: string, query: string){
    return new Promise(resolve => db.view(view, query, function(err, body){
        resolve({err: err, body: body});
    }));
}


function asyncBulk(db: Database, docs: any){
    return new Promise(resolve => db.bulk(docs, function(err, body){
        resolve({err: err, body: body});
    }));
}


function fix_version(version){
    var to_check = "x@" + version;
    return npa(to_check).spec;
}


async function main(){
    var registry: Database = nano.db.use("registry");

    // we generate a table with all the versions of a package to use with semver
    console.log("Fetching all versions...");
    var versionsRows = await asyncView(registry, "versions", "all");
    var table: {[id: string]: string} = {};
    var rows = versionsRows["body"]["rows"];

    for(var i = 0; i < rows.length; i++){
        var row = rows[i];
        var versions = _.map(row["value"], val => val["version"]);
        table[row["id"]] = versions;
    }

    console.log("ready");


    var step = 5000;
    var cache: {[key: string]: string} = {};

    for(var skip = 0; skip <= 2400000; skip = skip + step){
        console.log("Next iteration: " + skip);

        console.log("Fetching dependencies...");
        // Now we get all the dependencies of a package, we iterate for each package
        // and its dependencies and evaluate the versions with semver
        var depsRows = await asyncView(registry, "deps", "all?limit=" + step + "&skip=" + skip);
        var rows = depsRows["body"]["rows"];

        var documents = [];

        console.log("ready");
        console.log("Finding dependencies...");

        for(var i = 0; i < rows.length; i++){
            var pack = rows[i];
            var versionsDic = {};

            // For each version of the package, we get the dependencies
            for(var version in pack["value"]){
                var deps_satisfied = {};
                // and for each dependency we get the requested version
                for(var dep in pack["value"][version]){

                    if(table[dep] !== undefined){
                        var request = pack["value"][version][dep];
                        var key = dep + request;

                        if(cache[key]){
                            deps_satisfied[dep] = cache[key];
                        }else{
                            var satisfies = _.filter(table[dep], function(x){
                                return semver.satisfies(x, request)
                            });
                            deps_satisfied[dep] = satisfies;
                            cache[key] = satisfies;
                        }
                    }else{
                        //we can't find this dependency in the registry, we just add
                        //it and will take care of this in npm2cudf.py
                        deps_satisfied[dep] = [request];
                    }
                }

                versionsDic[fix_version(version)] = deps_satisfied;
            }

            var doc = {
                "_id": pack["id"],
                value: versionsDic
            };
            documents.push(doc);
        }

        console.log("ready");
        console.log("Storing dependencies...");

        var results = await asyncBulk(registry_dependencies, {docs: documents});

        if(results["err"]){
            console.log(results["err"]);
        }else{
            console.log("ready");
        }
    }
}


main();
