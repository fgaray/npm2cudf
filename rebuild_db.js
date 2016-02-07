var nano = require('nano')("http://127.0.0.1:5984");
var cookies = {};
var Futures = require('futures');




var dbName = "registry";


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
    .then(function(next){
        //nano.db.destroy('registry_fixed', function(err){
            //nano.db.create('registry_fixed');
            nano.db.destroy('registry_dependencies', function(){
                nano.db.create('registry_dependencies');
                next();
            });
        //});
    })
    .then(function(next){
        console.log("Ready");
    });
