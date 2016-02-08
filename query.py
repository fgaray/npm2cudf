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


## Template for a item in a cudf file
cudf = """Package: {{name}}
Version: {{version}}
Depends: {{dependencies}}
"""



def get_all_docs():
    """
    Get all the documents/packages of npm
    """
    print "Getting all documents..."
    r = requests.get("http://localhost:5984/registry_dependencies/_all_docs?include_docs=true&limit=1000")
    print "Done"
    return r.json()["rows"]

def generate_table_versions():
    print "Generating table"
    r = requests.get("http://localhost:5984/registry_fixed/_all_docs?include_docs=true")
    package = {}
    for r in r.json()["rows"]:
        package[r["id"]] = {}
        for doc in r["doc"]["value"]:
            package[r["id"]][doc["version"]] = doc["number"]
    return package




def generate_cudf(table, packages):
    cudf_txt = ""
    for p in packages:
        p = p["doc"]
        versions = p["value"].keys()
        for v in versions:
            deps = p["value"][v]
            cudf_deps = generate_deps_cudf(deps)
            cudf_txt = cudf_txt + pystache.render(cudf, {
                'name': p["_id"],
                'version': table[p["_id"]][v],
                'dependencies': cudf_deps
                }) + "\n"
    return cudf_txt

def generate_deps_cudf(deps):
    dependencies = ""
    total = len(deps.keys()) - 1
    for i, d in enumerate(deps.keys()):
        try:
            versions = map(lambda version: d + "(=" + str(version["number"]) + ")",  deps[d])
            versions =  " | ".join(versions)
            if len(versions) != 0:
                if i != total:
                    dependencies = dependencies + versions + ", "
                else:
                    dependencies = dependencies + versions
        except TypeError:
            # This is not a available version 
            versions = map(lambda version: d + "-" + fix_url(str(version)),  deps[d])
            versions =  " | ".join(versions)
            if len(versions) != 0:
                if i != total:
                    dependencies = dependencies + versions + ", "
                else:
                    dependencies = dependencies + versions
    return dependencies

def fix_url(url):
    url = url.replace("^", "").replace("~", "").replace("/", "").replace("@", "")
    url = url.replace("*", "any")
    return url



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
    packages = get_all_docs()
    table = generate_table_versions()
    cudf_txt = generate_cudf(table, packages)
    f = open("npm.cudf", "w")
    f.write(cudf_txt)
    f.close()
