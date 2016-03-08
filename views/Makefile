all: versions_all.js install_views.js deps_generator.js deps.js versions_fixed_all.js


versions.js: versions.ts
	tsc versions.ts

deps.js: deps.ts
	tsc deps.ts

versions_fixed.js: versions_fixed.ts
	tsc versions_fixed.ts

versions_all.js: versions.js
	browserify versions.js -o versions_all.js

versions_fixed_all.js: versions_fixed.js
	browserify versions_fixed.js -o versions_fixed_all.js

install_views.js: install_views.ts
	tsc --target es6 --module commonjs install_views.ts

deps_generator.js: deps_generator.ts
	tsc --target es6 --module commonjs deps_generator.ts

install:
	node install_views.js

clean:
	rm -f *.js
