declare var require: any;
declare var fs: any;


var nano = require('nano')("http://127.0.0.1:5984");
var fs   = require('fs');




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


function asyncList(db: Database, view: string, query: string){
    return new Promise(resolve => db.view(view, query, function(err, body){
        resolve({err: err, body: body});
    }));
}


interface Database{
    insert: Function;
    db: Function;
    destroy: Function;
    get: Function;
    view: Function;
}

