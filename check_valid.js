// Uses the parse of npm for semver, to check if a version is a valid semver
//
var semver = require('semver');
var express = require('express');
var app = express();

app.get("/:version", function(req, res){
    var request = req.params.version;
    res.send(JSON.stringify(semver.valid(request)));
});


app.listen(3001, function(){
    console.log("Running");
});
