CLANG_OPTS:=-std=c++11 -Wno-unused-value -Wno-switch -Wno-parentheses

EMCC_OPTS:=--bind -Os -s WASM=0 -s EXPORTED_RUNTIME_METHODS="['getValue']"
EMCC_OPTS+=-s DISABLE_EXCEPTION_CATCHING=1 -s NO_EXIT_RUNTIME=1 -s NO_FILESYSTEM=1
EMCC_OPTS+=-s TOTAL_MEMORY=16777216 --memory-init-file 0
EMCC_OPTS+=-s USE_OGG=1 -s USE_VORBIS=1

EMCC_LINKS:=-I vendor/pxtone-source-code-170212a/pxtone
EMCC_SRCS:=src/bind.cpp $(wildcard vendor/pxtone-source-code-170212a/pxtone/*.cpp)

dist/pxtnDecoder.js:
	mkdir -p dist && \
	em++ $(CLANG_OPTS) $(EMCC_OPTS) $(EMCC_LINKS) $(EMCC_SRCS) -o dist/pxtnDecoder.js

clean:
	$(RM) -rf dist/pxtnDecoder.js