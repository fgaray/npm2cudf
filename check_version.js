// This server receive a request and all the availables versios of a package and
// find the ones that satisfies the request.
//
// For example:
// request: "<= 1.0.3"
// availables: "1.0.2 1.0.3 1.0.4"
//
// It should return [1.0.2, 1.0.3] as a JSON
//
var semver = require('semver');
var express = require('express');
var app = express();


app.get("/:version/:availables", function(req, res){
    var request = req.params.version;
    var availables = JSON.parse(req.params.availables).split(" ");
    var ok = [];


    for(var i = 0; i < availables.length; i++){
        if(semver.satisfies(availables[i], request)){
            ok.push(availables[i]);
        }
    }

    res.send(JSON.stringify(ok));
});

app.listen(3003, function(){
    console.log("Running");
});
