/// <reference path="couchdb_common.ts"/>

declare var require: any;
declare var fs: any;


var nano = require('nano')("http://127.0.0.1:5984");
var fs   = require('fs');



declare var emit: Function;
declare var doc_couchdb: Doc;


interface Database{
    insert: Function;
    db: Function;
    destroy: Function;
    get: Function;
}


function asyncInsert(db: Database, doc: any){
    return new Promise(resolve => db.insert(doc, function(err, body){
        resolve({ err: err, body: body});
    }));
}


function asyncGet(db: Database, id: string){
    return new Promise(resolve => db.get(id, function(err, body){
        resolve({ err: err, body: body});
    }));
}


function asyncDestroy(db: Database, id: string, rev: string){
    return new Promise(resolve => db.destroy(id, rev, function(err, body){
        resolve({ err: err, body: body});
    }));
}


function asyncReadFile(file: string){
    return new Promise(resolve => fs.readFile(file, 'utf8', function(err, data){
        resolve({err: err, data: data});
    }));
}


interface View {
    _id: string;
    language: string;
    views: {[view: string]: {[name: string]: string}}
}






var registry: Database = nano.db.use("registry");

declare var process: any;


/************** The Program ***************************************************/


var versions_view: View = {
    "_id": "_design/versions",
    "language": "javascript",
    "views": {
        "all": {
            "map": "versions_all.js"
        }
    }
};


var versions_fixed_view: View = {
    "_id": "_design/versions_fixed",
    "language": "javascript",
    "views": {
        "all": {
            "map": "versions_fixed_all.js"
        }
    }
};


var deps_view: View = {
    "_id": "_design/deps",
    "language": "javascript",
    "views": {
        "all": {
            "map": "deps.js"
        }
    }
};


// The views to be installed
var all_views: View[] = [
        //versions_view
        //deps_view
        versions_fixed_view
    ];


function add_wrap_function(program: string){
    return "function(doc_couchdb){" + program + "}";
}


/***************************** MAIN *******************************************/
async function main(){
    console.log("Installing...");
    var all_views_files: View[] = [];

    // we will read all the views from files 
    for(var i = 0; i < all_views.length; i++){
        var view = all_views[i];
        var fileName = view.views["all"]["map"];
        var versionsFile = await asyncReadFile(fileName);
        if(versionsFile["err"]){
            console.log("Can't read file " + fileName);
            process.exit(-1);
        }else{
            view.views["all"]["map"] = add_wrap_function(versionsFile["data"]);
            all_views_files.push(view);
        }
    }

    // Now we will install the views replacing them if they are already in the
    // database
    for(var i = 0; i < all_views_files.length; i++){
        var view: View = all_views_files[i];
        var doc = await asyncGet(registry, view._id);

        if(!doc["err"]){
            // there is already a document in the database, we need to delete it
            console.log("Deleting " + view._id);
            var res = await asyncDestroy(registry, view._id, doc["body"]["_rev"]);
            if(res["err"]){
                console.log("Can't delete view " + view._id);
                process.exit(-1);
            }
        }

        console.log("Installing " + view._id);
        var ret = await asyncInsert(registry, view);
        if(ret["err"]){
            console.log("Can't install " + view._id);
            console.log(ret["err"]);
            process.exit(-1);
        }else{
            console.log("View " + view._id + " installed");
        }
        console.log("");
    }

    console.log("All views are installed");
}

main();
