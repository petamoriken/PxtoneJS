all: build/Pxtone.min.opt.js lib/*

build/Pxtone.min.opt.js: build/Pxtone.js 
	uglifyjs build/Pxtone.js -c --comments "/PxtoneJS/" -o build/Pxtone.min.js && \
	optimize-js build/Pxtone.min.js > build/Pxtone.min.opt.js

build/Pxtone.js: src/*
	mkdir -p temp && \
	browserify -t babelify -s Pxtone src/index.js --no-commondir --igv global -i text-encoding -o temp/Pxtone.js && \
	echo "/*! PxtoneJS" v`node -pe "require('./package.json').version"` "http://git.io/PxtoneJS */" | cat - temp/Pxtone.js > build/Pxtone.js && \
	$(RM) -rf temp

lib/*: src/*
	$(RM) lib/* && \
	babel src -d lib

clean:
	$(RM) -rf lib/* build/* && \
	touch lib/.keep build/.keep