all: versions_all.js install_views.js


versions.js: versions.ts
	tsc versions.ts

versions_all.js: versions.js
	browserify versions.js -o versions_all.js

install_views.js: install_views.ts
	tsc --target es6 --module commonjs install_views.ts

install:
	node install_views.js

clean:
	rm -f *.js
