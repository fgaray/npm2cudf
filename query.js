var semver = require('semver');
var _ = require('underscore');
var npa = require('npm-package-arg');
var request = require('request');
var nano = require('nano')("http://127.0.0.1:5984");
var Futures = require('futures');
var async = require('async');

var registry_fixed = nano.db.use("registry_fixed");
var registry = nano.db.use("registry");
var registry_dependencies = nano.db.use("registry_dependencies");

var sequence = Futures.sequence();

sequence
    //.then(function(next){
        //registry.view("versions", "all", function(err, body){
            //next(body);
        //});
    //})
    //.then(function(next, body){
        //console.log("Fixing available versions");
        //var rows = _.map(body.rows, function(doc){
            //var versions = _.map(doc["value"], function(version){
                //var to_check = "x@" + version;
                //return npa(to_check).spec;
            //});
            //doc["value"] = versions;
            //doc["_id"]   = doc["id"];
            //doc["name"] = doc["id"];
            //return doc;
        //});
        //next(rows);
    //})
    //.then(function(next, docs){
        //var l = {docs : docs};
        //registry_fixed.bulk(l, function(err, body){
            //docs = null;
            //next();
        //});
    //})
    //here is the important part
    .then(function(next){
        registry_fixed.list({include_docs: true}, next);
    })
    .then(function(next, err, body){
        function iter(acc, x){
            acc[x["id"]] = x["doc"]["value"];
            return acc;
        }
        var table = _.reduce(body.rows, iter, {});
        next(table);
    })
    .then(function(next, table){
        console.log("Generating dependencies");
        var cache = {};
        registry.view("deps", "all?limit=20000", function(err, body){

            function iterator(package, callback){
                var versions = [];
                for(var version in package["value"]){
                    versions.push(version);
                }

                function iterator(versions, version, callback){
                    var deps = [];
                    for(var dep in package["value"][version]){
                        deps.push(dep);
                    }

                    function iterator(deps_satisfied, dep, callback){
                        var request = package["value"][version][dep];
                        if(cache[dep] !== undefined){
                            if(cache[dep][request] !== undefined){
                                deps_satisfied[dep] = cache[dep][request];
                            }else{
                                if(table[dep] !== undefined){
                                    var satisfies = _.filter(table[dep], function(x){ return semver.satisfies(x, request)});
                                    cache[dep][request] = satisfies;
                                    deps_satisfied[dep] = satisfies;
                                }else{
                                    deps_satisfied[dep] = [];
                                }
                            }
                        }else{
                            cache[dep] = {};
                            if(table[dep] !== undefined){
                                var satisfies = _.filter(table[dep], function(x){ return semver.satisfies(x, request)});
                                cache[dep][request] = satisfies;
                                deps_satisfied[dep] = satisfies;
                            }else{
                                deps_satisfied[dep] = [];
                            }
                        }

                        callback(null, deps_satisfied);
                    }

                    async.reduce(deps, {}, iterator, function(err, result){
                        versions[version] = result;
                        callback(null, versions);
                    });
                }

                async.reduce(versions, {}, iterator, function(err, result){
                    var doc = {
                        "_id": package["id"],
                        value: result
                    };
                    registry_dependencies.insert(doc, function(err, body){
                        callback();
                    });
                });
            }

            async.map(body.rows, iterator);
        });
    })
    .then(function(next, err, body){
        console.log("Listo");
        next();
    });


