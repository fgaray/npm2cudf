from couchdb.client import *
import pystache
import semantic_version
import unittest
import re
from Naked.toolshed.shell import muterun_js
import json
import pyfscache
from multiprocessing import Pool
import requests
import pickle
#from progressbar import ProgressBar, SimpleProgress


# We assume that there is a crunchdb database working on 5984
server = Server(url="http://localhost:5984")
db = server['registry']

# We will use a disk cache for som functions
cache_it = pyfscache.FSCache('cache')

# List of usseles items in the database 
ignored = ["_design/app ", "_design/scratch"]

## Template for a item in a cudf file
cudf = """Package: {{name}}
Version: {{version}}
Depends: {{dependencies}}
"""



@cache_it
def get_all_docs():
    """
    Get all the documents/packages of npm
    """
    print "Getting all documents..."
    all_docs = list(db.view("_all_docs"))
    print "done"
    return all_docs


@cache_it
def generar_tabla(packages):
    """
    Generate a dictionary where we can see all the versions available of a
    package: d[package-name] = [versions]
    """
    d = {}
    total = len(packages)
    i = 0
    for x in packages:
        if i % 1000 == 0:
            print str(i) + "/" + str(total) + " (" + str(100.0 / total * i) + ")"
        id = x["id"]
        x = db.get(x["id"])
        try:
            d[x["name"]] = x["versions"].keys()
        except KeyError:
            print "Warning: ignoring " + id + " because it dosen't have any versions"
            ignored.append(id)
        i = i + 1
    return d

def check_valid(version):
    """
    We make a request to a nodejs server where we can check if the current
    version is a valid one
    """
    r = requests.get("http://localhost:3001/" + version)
    if r.json():
        return True
    else:
        return False


def fix(version):
    """
    Using the parser of npm running in a nodejs server, we send a request to fix
    the version if it is not a valid one
    """
    if not check_valid(version):
        r = requests.get("http://localhost:3002/" + version)
        #print version + " bad version, fixed with: " + r.json()
        return r.json()
    else:
        return version

def fix_tabla(tabla):
    """
    Fix the versions in the table with the fix() function
    """
    def f((i, k)):
        if i % 1000 == 0:
            print i
        nueva = {}
        versions = tabla[k]
        versions_fixed = []
        for v in versions:
            fixed = fix(v)
            versions_fixed.append(fixed)
        nueva[k] = versions_fixed
        return nueva
    return f

def generar_dependencias(packages, tabla):
    """
    Generates the dependencies of a package using the npm semver comparator
    running in a NPM server
    """
    dependencias = {}
    total = len(packages)
    i = 0
    for p in packages:
        # For each package, we get all the information in the database
        if i >= 1000:
            break
        print str(i) + "/" + str(total) + " (" + str(100.0 / total * i) + ")"
        id = p["id"]
        if p["id"] in ignored:
            print "Skiping " + p["id"]
            continue
        p = db.get(p["id"])
        try:
            nombre = p["name"]
        except:
            continue
        print "Haciendo " + nombre
        deps = []
        for v in p["versions"].keys():
            # for each version of the package, we try to find the dependencies
            # that satisfies the one needed by it
            try:
                dependencies = p["versions"][v]["dependencies"]
                for dep in dependencies.keys():
                    # for each dependencie, we ask what versions of that package
                    # satisfies the one required.
                    version_request = dependencies[dep]
                    if version_request.find("/") != -1:
                        # This is not a version, just use it as it
                        print version_request + " no es una version semantica"
                        try:
                            dependencias[nombre + ";" + v]
                            dependencias[nombre + ";" + v][dep] = [version_request]
                        except KeyError:
                            dependencias[nombre + ";" + v] = { dep: [version_request] }
                        continue

                    disp = tabla[dep]
                    if version_request == "":
                        # if the package don't specifies a version, then it can
                        # be anyone
                        try:
                            dependencias[nombre + ";" + v]
                            dependencias[nombre + ";" + v][dep] = disp
                        except KeyError:
                            dependencias[nombre + ";" + v] = { dep: disp }
                        continue

                    # We search in the table the available verions of a package.
                    disponibles = ""
                    others = []
                    for d in disp:
                        disponibles = disponibles + " " + d

                    r = requests.get("http://localhost:3003/" + version_request + "/" + json.dumps(disponibles))
                    try:
                        try:
                            dependencias[nombre + ";" + v]
                            dependencias[nombre + ";" + v][dep] = r.json()
                        except KeyError:
                            dependencias[nombre + ";" + v] = { dep: r.json() }
                    except:
                        print r.text
                        print "http://localhost:3003/" + version_request + "/" + json.dumps(disponibles)
                        exit(-1)
            except KeyError:
                # This package doesn't have any version
                dependencias[nombre + ";" + v] = {}
        i = i + 1
    return dependencias

def generate_cudf(packages):
    cudf_txt = ""
    for k in packages.keys():
        name, version = k.split(";")
        cudf_deps = generate_deps_cudf(packages[k])
    
        cudf_txt = cudf_txt + pystache.render(cudf, {
            'name': name,
            'version': version,
            'dependencies': cudf_deps
            }) + "\n"
    return cudf_txt
        




def generate_deps_cudf(deps):
    dependencies = ""
    total = len(deps.keys()) - 1
    for i, d in enumerate(deps.keys()):
        versions = map(lambda version: d + "=" + version,  deps[d])
        versions =  " | ".join(versions)
        if i != total:
            dependencies = dependencies + versions + ", "
        else:
            dependencies = dependencies + versions
    return dependencies


@cache_it
def merge_dic(l):
    d = {}
    for x in l:
        for k in x.keys():
            d[k] = x[k]
    return d

def take(l, m):
    i = 0
    total = len(l)
    nl = []
    while i < total and i < m:
        nl.append(l[i])
        i = i + 1
    return nl


if __name__ == "__main__":
    print "Gettting the documents"
    all_docs = get_all_docs()            
    print "Generating the table"
    tabla = generar_tabla(all_docs)
    print "Fixing the versions in the table"
    f = fix_tabla(tabla)
    p = Pool(3)
    tabla = p.map(f, enumerate(tabla.keys()))
    print "Mergin the table"
    tabla = merge_dic(tabla)
    print "Saving step..."
    f = open("tabla.bin", "wb")
    pickle.dump(tabla, f)
    f.close()
    exit(0)
    print "The table is ready"
    print "Reading the table"
    f = open("tabla.bin", "rb")
    tabla = pickle.load(f)
    f.close()
    deps = generar_dependencias(all_docs, tabla)
    print "The dependencies are ready"
    print "Generating CUDF"
    cudf_txt = generate_cudf(deps)
    f = open("npm.cudf", "w")
    f.write(cudf_txt)
    f.close()
