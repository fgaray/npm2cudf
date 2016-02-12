# -*- coding: utf-8 -*-
import pystache
from multiprocessing import Pool
import requests
import codecs

preamble = """
preamble: 
property: number: string
property: license: string


"""


## Template for a item in a cudf file
cudf = """package: {{name}}
version: {{version}}
{{#dependencies}}
depends: {{dependencies}}
{{/dependencies}}
number: {{number}}
license: {{license}}
"""



def get_all_docs(step, index):
    """
    Get all the documents/packages of npm
    """
    print "Getting all documents..."
    r = requests.get("http://localhost:5984/registry_dependencies/_all_docs?include_docs=true&limit=%d&skip=%d" %(step, index))
    print "Done"
    return r.json()["rows"]

def generate_table_versions():
    print "Generating table"
    r = requests.get("http://localhost:5984/registry/_design/versions/_view/all")
    package = {}
    for r in r.json()["rows"]:
        package[r["id"]] = {}
        for doc in r["value"]:
            package[r["id"]][doc["version"]] = {
                    "number": doc["number"]
                    , "license": doc["license"]
                    }
    return package


def generate_deps_cudf(deps):
    dependencies = ""
    github = [] # github repositories to be stored as a dependency
    total = len(deps.keys()) - 1
    extras = []
    for i, d in enumerate(deps.keys()):
        try:
            number_deps = map(lambda version: table[d][version]["number"], deps[d])
            versions = map(lambda version: fix_name(d) + " = " + str(version), number_deps)
            versions =  " | ".join(versions)
            if len(versions) != 0:
                if i != total:
                    dependencies = dependencies + versions + ", "
                else:
                    dependencies = dependencies + versions
        except KeyError:
            # There is not a available version 
            versions = map(lambda version: fix_url(d) + fix_url(str(version)),  deps[d])
            if is_scoped(d) or is_github(d):
                extras = extras + versions
            for v in deps[d]:
                # The github url can also be in the version field
                if is_github(v):
                    extras.append(fix_url(d) + fix_url(str(v)))
            versions =  " | ".join(versions)
            if len(versions) != 0:
                if i != total:
                    dependencies = dependencies + versions + ", "
                else:
                    dependencies = dependencies + versions
    if dependencies[-2:] == ", ":
        dependencies = dependencies[:-2]
    return dependencies, extras


def is_github(repo):
    """
    Checks if the dependency is a github repository
    These are the git/github valid URL and repository
        git://github.com/user/project.git#commit-ish
        git+ssh://user@hostname:project.git#commit-ish
        git+ssh://user@hostname/project.git#commit-ish
        git+http://user@hostname/project/blah.git#commit-ish
        git+https://user@hostname/project/blah.git#commit-ish
        user/foo-project
        user/foo-project#commit-ish
    """
    if repo.find("git://") != -1 or repo.find("git+ssh") != -1 or repo.find("git+http") != -1:
        return True
    elif repo.find("/") != -1 and repo.find("@") == -1:
        return True
    else:
        return False


def is_scoped(package):
    try:
        if package[0] == "@":
            return True
        else:
            return False
    except:
        return False



def run(p):
    cudf_txt = ""
    p = p["doc"]
    versions = None
    all_extras = []
    debug = False
    try:
        versions = p["value"].keys()
    except:
        return cudf_txt
    for v in versions:
        deps = p["value"][v]
        cudf_deps, extras = generate_deps_cudf(deps)
        all_extras = all_extras + extras
        cudf_txt = cudf_txt + pystache.render(cudf, {
            'name': fix_name(p["_id"]),
            'version': table[p["_id"]][v]["number"],
            'license': table[p["_id"]][v]["license"],
            'dependencies': cudf_deps,
            'number': v
            }) + "\n"
    return (cudf_txt, all_extras)

def fix_name(name):
    name = name.replace("_", "%5f")
    return name

def generate_cudf(table, packages, pool = None):
    print "Generating deps"
    if not pool:
        #pool = Pool(4)
        pass
    results = map(run, packages)
    try:
        results, extras = zip(*results)
    except:
        extras = []
        results = []
    print "Mergin results"
    cudf_txt = "".join(results)
    extras_list = []
    for ext in extras:
        extras_list.append(ext)
    return cudf_txt, pool, extras_list


def fix_url(url):
    if is_scoped(url):
        url = "scoped" + url 
    elif is_github(url):
        url = "github" + url
    url = url.replace("^", "").replace("~", "").replace("/", "").replace("@", "")
    url = url.replace("*", "any")
    url = url.replace("|", "-")
    url = url.replace("&", "and")
    url = url.replace("?", "q")
    url = url.replace(">=", "")
    url = url.replace("=", "equals")  # Esto es solo para un error en swign=
    url = url.replace("#", "hash")
    url = url.replace(" ", "space")
    url = url.replace("{}", "")
    url = url.replace("<2", "")
    url = url.replace("<", "lt")
    url = url.replace(">", "gt")
    url = url.replace(":", "-")
    url = url.replace("_", "%5f")
    url = url.replace(".", "dot")
    url = url.replace("'", "quote")
    url = url.replace("\"", "quote")
    url = url.replace("!", "exclamation")
    url = url.replace(";", "comma")
    url = url.replace("(", "par-open")
    url = url.replace(")", "par-close")
    url = url.replace("\\", "back-slash")
    special = u"\u00F8"
    url = url.replace(special, "empty-special-char")
    return url


def concat(l):
    nl = []
    for x in l:
        for y in x:
            nl.append(y)
    return nl


if __name__ == "__main__":
    table = generate_table_versions()
    i = 0
    step = 20000
    pool = None
    f = codecs.open("npm.cudf", "w", encoding = "utf-8")
    f.write(preamble)
    all_extras = []
    while i <= 250000:
    # while i <= 10000:
        print i
        packages = get_all_docs(step, i)
        cudf_txt, pool, extras = generate_cudf(table, packages, pool)
        all_extras = all_extras + extras
        f.write(cudf_txt)
        cudf_txt = ""
        i = i + step
    cudf_txt = ""
    all_extras = list(set(concat(all_extras)))
    for extra in all_extras:
        cudf_txt = cudf_txt + pystache.render(cudf, {
            'name': extra, 
            'version': 1,
            'number': 'not-available',
            'license': 'not-available'
            }) + "\n"
    f.write(cudf_txt)
    f.close()
