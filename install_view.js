var nano = require('nano')("http://127.0.0.1:5984");
var cookies = {};
var Futures = require('futures');




var dbName = "registry";

var versions = {
    "_id": "_design/versions",
    "language": "javascript",
    "views": {
        "all": {
            "map": "function(doc){" +
                "if(\"versions\" in doc && \"name\" in doc){"+
                    "var versions = doc[\"versions\"];"+
                    "var l = [];"+
                    "for(var key in versions){"+
                        "l.push(key);"+
                    "}"+
                    "emit(doc[\"name\"], l);"+
                "}"+
            "}"
        }
    }
};


var dependencies_version = {
    "_id": "_design/deps",
    "language": "javascript",
    "views": {
        "all": {
            "map": "function(doc){" +
                "if(\"versions\" in doc && \"name\" in doc){"+
                    "var versions = doc[\"versions\"];"+
                    "var d = {};"+
                    "for(var key in versions){"+
                        'var deps = versions[key]["dependencies"];' +
                        "d[key] = deps;"+
                    "}"+
                    "emit(doc[\"name\"], d);"+
                "}"+
            "}"
        }
    }
};


var registry = null;
var sequence = Futures.sequence();


sequence
    //.then(function(next){
        //nano.auth("felipe", "clave", function(err, body, headers){
            //if(err){
                //console.log("Error en el login");
            //}else{
                //console.log("Login");
                //auth = headers['set-cookie'];
                //nano = require('nano')({url: "http://127.0.0.1:5984", cookie: auth});
                //registry = nano.db.use("registry");
                //next();
            //}
        //});
    //})
    //.then(function(next){
        //registry_fixed = nano.db.use("registry_fixed");
        //registry = nano.db.use("registry");
        //nano.db.destroy('registry_fixed', function(){
            //nano.db.create('registry_fixed');
            //nano.db.destroy('registry_dependencies', function(){
                //nano.db.create('registry_dependencies');
                //next();
            //});
        //});
    //})
    .then(function(next){
        registry.get('_design/versions', next);
    })
    .then(function(next, err, body){
        if(err){
            next(null, null);
        }else{
            if(body){
                registry.destroy("_design/versions", body["_rev"], next);
            }else{
                next(null, null);
            }
        }
    })
    .then(function(next, err, body){
        if(err){
            console.log(err);
        }else{
            registry.insert(versions, next);
        }
    })
    .then(function(next){
        registry.get('_design/deps', next);
    })
    .then(function(next, err, body){
        if(err){
            next(null, null);
        }else{
            if(body){
                registry.destroy("_design/deps", body["_rev"], next);
            }else{
                next(null, null);
            }
        }
    })
    .then(function(next, err, body){
        if(err){
            console.log(err);
        }else{
            registry.insert(dependencies_version, next);
        }
    })
    .then(function(next, err, body){
        if(err){
            console.log(err);
        }else{
            console.log("Installed");
        }
    })
