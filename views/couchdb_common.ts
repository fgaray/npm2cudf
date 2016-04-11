type Dependencies = {[dependency: string]: string}
type Versions = {[version: string]: Version};


interface Version{
    name: string;
    version: string;
    description: string;
    dependencies: Dependencies;
    license?: string;
    repository?: any;
    dist: any;
    maintainers: any;
}


interface Doc{
    _id: string;
    _rev: string;
    name: string;
    description: string;
    versions: Versions;
}

declare var doc_couchdb: Doc;
declare var emit: Function;
