// This server receive a version and tries to fix it with the parser of NPM
var npa = require('npm-package-arg');
var express = require('express');
var app = express();

app.get("/:version", function(req, res){
    var request = req.params.version;
    parsed = npa("x@" + request);
    res.send(JSON.stringify(parsed.spec));
});


app.listen(3002, function(){
    console.log("Running");
});
