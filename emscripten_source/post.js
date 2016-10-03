// emscripten methods
var _malloc = Module["_malloc"], _free = Module["_free"], getValue = Module["getValue"];
var decodeNoise = Module["decodeNoise"], createPxtone = Module["createPxtone"], releasePxtone = Module["releasePxtone"], getPxtoneText = Module["getPxtoneText"], getPxtoneInfo = Module["getPxtoneInfo"], vomitPxtone = Module["vomitPxtone"];

var global = this;
var request = global.requestIdleCallback || global.setImmediate || function(callback) { return setTimeout(callback, 0) };
var cancel = global.cancelIdleCallback || global.clearImmediate || clearTimeout;

function Memory(val) {
	var ptr, type, size;

	if(typeof val === "string") {
		size = Runtime.getNativeTypeSize(val);
		ptr = _malloc(size);
		type = val;
	} else {
		size = val;
		ptr = _malloc(size);
		type = "*";
	}

	this.ptr = ptr;
	this.type = type;
}

var Memory$prototype = Memory["prototype"];

Memory$prototype.release = function() {
	_free(this.ptr);
};

Memory$prototype.getValue = function(type) {
	type = type || this.type;
	var ptr = this.ptr;
	return getValue(ptr, type);
};


function decode(type, inputBuffer, ch, sps, bps) {
	// set buffer to Emscripten
	var size = inputBuffer.byteLength, bufferMem = new Memory(size);
	HEAPU8.set(new Uint8Array(inputBuffer), bufferMem.ptr);

	var promise = Promise.resolve();
	var outputBuffer, data = null;

	switch(type) {
		case "noise":
			promise = promise.then(function() {
				return new Promise(function(resolve, reject) {
					request(function() {
						var outputMem = new Memory("*"), outputSizeMem = new Memory("i32");

						if(!decodeNoise(bufferMem.ptr, size, ch, sps, bps, outputMem.ptr, outputSizeMem.ptr)) {
							outputMem.release();
							outputSizeMem.release();
							reject(new Error("Decode Pxtone Noise Error."));
						}

						var outputStart = outputMem.getValue(), outputEnd = outputStart + outputSizeMem.getValue();
						outputBuffer = buffer.slice(outputStart, outputEnd);

						// free
						_free(outputStart);
						outputMem.release();
						outputSizeMem.release();

						resolve();
					});
				});
			});
			break;

		case "pxtone":
			(function() {
				var pxVomitMem = new Memory("*"), docMem = new Memory("*");

				// create
				if(!createPxtone(
					bufferMem.ptr, size, ch, sps, bps,
					pxVomitMem.ptr, docMem.ptr
				)) {
					throw new Error("Create Pxtone Vomit Error.");
				}

				// text
				var titleBuffer = null, commentBuffer = null;
				(function() {
					var titleMem = new Memory("*"), titleSizeMem = new Memory("i32");
					var commentMem = new Memory("*"), commentSizeMem = new Memory("i32");
					var titleStart, titleEnd, commentStart, commentEnd;

					if(!getPxtoneText(
						pxVomitMem.ptr, 
						titleMem.ptr, titleSizeMem.ptr,
						commentMem.ptr, commentSizeMem.ptr
					)) {
						throw new Error("Get Pxtone Vomit Text Error.");
					}

					titleStart = titleMem.getValue(), commentStart = commentMem.getValue();
					
					if(titleStart) {
						titleEnd = titleStart + titleSizeMem.getValue();
						titleBuffer = buffer.slice(titleStart, titleEnd);
					}

					if(commentStart) {
						commentEnd = commentStart + commentSizeMem.getValue();
						commentBuffer = buffer.slice(commentStart, commentEnd);
					}

					titleMem.release(); titleSizeMem.release();
					commentMem.release(); commentSizeMem.release();
				})();

				// info
				var outputSize, loopStart, loopEnd;
				(function() {
					var outputSizeMem = new Memory("i32");					
					var loopStartMem = new Memory("double"), loopEndMem = new Memory("double");

					if(!getPxtoneInfo(
						pxVomitMem.ptr, ch, sps, bps,
						outputSizeMem.ptr, loopStartMem.ptr, loopEndMem.ptr
					)) {
						throw new Error("Get Pxtone Vomit Info Error.");
					}

					outputSize = outputSizeMem.getValue();

					loopStart = loopStartMem.getValue();
					loopEnd = loopEndMem.getValue();

					outputSizeMem.release();
					loopStartMem.release(); loopEndMem.release();
				})();

				data = {
					"loopStart":		loopStart,
					"loopEnd":			loopEnd,
					"titleBuffer":		titleBuffer,
					"commentBuffer":	commentBuffer 
				};

				// vomit
				outputBuffer = new ArrayBuffer(outputSize);
				promise = promise.then(function() {
					var tempSize = 4096, tempBufferMem = new Memory(tempSize);
					var tempArray = HEAPU8.subarray(tempBufferMem.ptr, tempBufferMem.ptr + tempSize);
					
					var outputArray = new Uint8Array(outputBuffer);

					var pc = 0;
					return new Promise(function(resolve, reject) {
						request(function req() {
							var s = tempSize < (outputSize - pc) ? tempSize : (outputSize - pc);

							if(!vomitPxtone(pxVomitMem.ptr, tempBufferMem.ptr, s)) {
								tempBufferMem.release();								
								reject(new Error("Pxtone Vomit Error."));
							}

							// memcopy
							outputArray.set((s === tempSize ? tempArray : HEAPU8.subarray(tempBufferMem.ptr, tempBufferMem.ptr + s)), pc);
							pc += s;

							// repeat
							if(pc < outputSize) {
								request(req);
							} else {
								tempBufferMem.release();
								resolve();
							}
						});
					});

				// release 
				}).then(function() {
					releasePxtone(pxVomitMem.ptr, docMem.ptr);
					pxVomitMem.release(); docMem.release();
				});

			})();
			break;
	}


	return promise.then(function() {
		// free
		bufferMem.release();
		return [outputBuffer, data];
	});
}


var ENVIRONMENT_IS_REQUIRE = (typeof module !== "undefined" && module["exports"]);

// export
if(ENVIRONMENT_IS_REQUIRE) {
	module["exports"] = decode;
} else if(ENVIRONMENT_IS_WEB) {
	global["pxtnDecoder"] = decode;
} else if(ENVIRONMENT_IS_WORKER) {
	global["onmessage"] = function(e) {
		var data = e["data"];
		
		decode(data["type"], data["buffer"], data["ch"], data["sps"], data["bps"]).then(function(decoded) {
			var buffer = decoded[0];
			var rawData = decoded[1];

			var transfer = [buffer];
			var titleBuffer, commentBuffer;
			if(rawData) {
				titleBuffer = rawData["titleBuffer"];
				commentBuffer = rawData["commentBuffer"];
				
				if(titleBuffer)		transfer.push(titleBuffer);
				if(commentBuffer)	transfer.push(commentBuffer);
			}

			global["postMessage"]({
				"sessionId":	data["sessionId"],
				"buffer":		buffer,
				"data":			rawData
			}, transfer);
		});

	};
}

}();