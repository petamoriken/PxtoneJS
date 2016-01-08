PXTONE_DIR:=pxtone_source
EMCC_DIR:=emscripten_source

CLANG_OPTS:=-std=c++11 -Wno-unused-value -Wno-switch

EMCC_OPTS:=--bind -s EXPORTED_RUNTIME_METHODS="['getValue']"
EMCC_OPTS+=-s DISABLE_EXCEPTION_CATCHING=1 -s NO_EXIT_RUNTIME=1 -s NO_BROWSER=1 -s NO_FILESYSTEM=1
EMCC_OPTS+=-s TOTAL_MEMORY=33554432 -s ALLOW_MEMORY_GROWTH=1
EMCC_OPTS+=-Oz --memory-init-file 0 --llvm-lto 1 --closure 1
EMCC_OPTS+=--pre-js $(EMCC_DIR)/pre.js --post-js $(EMCC_DIR)/post.js

EMCC_LINKS:=-I $(PXTONE_DIR)/src-oggvorbis -I $(PXTONE_DIR)/src-pxtone -I $(PXTONE_DIR)/src-pxtonePlay -I $(PXTONE_DIR)/src-pxwr

EMCC_SRCS:=-x c $(PXTONE_DIR)/src-oggvorbis/*.c $(PXTONE_DIR)/src-oggvorbis/.libs/libvorbis.a
EMCC_SRCS+=-x c++ $(EMCC_DIR)/bind.cpp $(PXTONE_DIR)/src-pxtone/*.cpp $(PXTONE_DIR)/src-pxtonePlay/*.cpp $(PXTONE_DIR)/src-pxwr/*.cpp


all: build/Pxtone.min.js build/pxtnDecoder.min.js lib/*


build/Pxtone.min.js: build build/Pxtone.js
	uglifyjs build/Pxtone.js -c --comments "/https://git.io/vuKZH/" -o build/Pxtone.min.js

build/Pxtone.js: build src/* src/pxtnDecoder.js
	mkdir -p temp && \
	browserify -t babelify -s Pxtone src/index.js --no-commondir --igv global -o temp/Pxtone.js && \
	echo "/*! Pxtone.js https://git.io/vuKZH */" | cat - temp/Pxtone.js > build/Pxtone.js

build/pxtnDecoder.min.js: build build/pxtnDecoder.js
	uglifyjs build/pxtnDecoder.js -c --comments "/https://git.io/vuKZH/" -o build/pxtnDecoder.min.js

build/pxtnDecoder.js: build src/pxtnDecoder.js
	echo "/*! pxtnDecoder.js https://git.io/vuKZH */" | cat - src/pxtnDecoder.js > build/pxtnDecoder.js

build: src/* src/pxtnDecoder.js
	mkdir -p build

lib/*: src/* src/pxtnDecoder.js
	$(RM) lib/* && \
	babel src --ignore "pxtnDecoder.js","emscripten_source/*" -d lib && \
	cp src/pxtnDecoder.js lib/

src/pxtnDecoder.js: $(PXTONE_DIR)/src-pxtone/* $(PXTONE_DIR)/src-pxtonePlay/* $(PXTONE_DIR)/src-pxwr/* $(EMCC_DIR)/*
	em++ $(CLANG_OPTS) $(EMCC_OPTS) $(EMCC_LINKS) $(EMCC_SRCS) -o src/pxtnDecoder.js

clean:
	$(RM) -rf lib/* build temp src/pxtnDecoder.js