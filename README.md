# How to use it

You need to install and run this programs in order before getting a CUDF file
from NPM.

1. Build a CouchDB replica from https://skimdb.npmjs.com/registry to a local
   database called registry using the web interface:
   <http://localhost:5984/_utils/replicator.html>
2. Enter in the views/ directory, use make to compile the sources and then
   install the views with "node install_views.js"
3. Create another database in CouchDB called "registry_dependencies" and run in
   the view directory: "node views/deps_generator.js".
4. Go to the root of this proyect and run: "python npm2cudf.py", this will
   generate a "npm.cudf" file with all the packages in the registry of npm.
