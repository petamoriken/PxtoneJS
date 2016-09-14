// emscripten methods
var _malloc = Module["_malloc"], _free = Module["_free"], getValue = Module["getValue"];
var decodeNoise = Module["decodeNoise"], decodePxtone = Module["decodePxtone"];

function Memory(val) {
	var ptr, type, size;

	if(typeof val === "string") {
		size = sizeof(val);
		ptr = _malloc(size);
		type = val;
	} else {
		size = val;
		ptr = _malloc(size);
		type = "";
	}

	this.ptr = ptr;
	this.type = type;
	this.byteLength = size;
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

function sizeof(type) {
	var size;

	switch(type) {
//		case "i8":
//			size = 1;
//			break;

//		case "i16":
//			size = 2;
//			break;

//		case "i32":
//		case "float":
		case "*":
			size = 4;
			break;

//		case "i64":
		case "double":
			size = 8;
			break;

		default:
			throw new Error("Unexptcted type: " + type);
	}

	return size;
}

function decode(type, inputBuffer, ch, sps, bps) {
	// set buffer to Emscripten
	var size = inputBuffer.byteLength, bufferMem = new Memory(size);
	HEAPU8.set(new Uint8Array(inputBuffer), bufferMem.ptr);

	var outputMem = new Memory("*"), outputSizeMem = new Memory("*");
	var data = null;

	switch(type) {
		case "noise":
			if(!decodeNoise(bufferMem.ptr, size, ch, sps, bps, outputMem.ptr, outputSizeMem.ptr)) {
				throw new Error("Decode Pxtone Noise Error.");
			}
			break;

		case "pxtone": 
			(function() {
				var loopStartMem = new Memory("double"), loopEndMem = new Memory("double");
				var titleMem = new Memory("*"), titleSizeMem = new Memory("*");
				var commentMem = new Memory("*"), commentSizeMem = new Memory("*");
				var titleStart, titleEnd, commentStart, commentEnd;

				if(!decodePxtone(
					bufferMem.ptr, size, ch, sps, bps,
					outputMem.ptr, outputSizeMem.ptr,
					loopStartMem.ptr, loopEndMem.ptr,
					titleMem.ptr, titleSizeMem.ptr,
					commentMem.ptr, commentSizeMem.ptr
				)) {
					throw new Error("Decode Pxtone Project Error.");
				}

				titleStart = titleMem.getValue(), titleEnd = titleStart + titleSizeMem.getValue();
				commentStart = commentMem.getValue(), commentEnd = commentStart + commentSizeMem.getValue();

				data = {
					"loopStart":		loopStartMem.getValue(),
					"loopEnd":			loopEndMem.getValue(),
					"titleBuffer":		buffer.slice(titleStart, titleEnd),
					"commentBuffer":	buffer.slice(commentStart, commentEnd)  
				};

				// free data
				loopStartMem.release(); loopEndMem.release();
				_free(titleStart); _free(commentStart);
				titleMem.release(); titleSizeMem.release(); commentMem.release(); commentSizeMem.release();
			})();
			break;
	}

	var outputStart = outputMem.getValue(), outputEnd = outputStart + outputSizeMem.getValue();
	var ret = buffer.slice(outputStart, outputEnd);

	// free
	_free(outputStart);
	bufferMem.release();
	outputMem.release();
	outputSizeMem.release();

	return [ret, data];
}


var ENVIRONMENT_IS_REQUIRE = (typeof module !== "undefined" && module["exports"]);

// export
if(ENVIRONMENT_IS_REQUIRE) {
	module["exports"] = decode;
} else if(ENVIRONMENT_IS_WEB) {
	self["pxtnDecoder"] = decode;
} else if(ENVIRONMENT_IS_WORKER) {
	self["onmessage"] = function(e) {
		var data = e["data"];
		var decoded = decode(data["type"], data["buffer"], data["ch"], data["sps"], data["bps"]);
		var buffer = decoded[0];
		var rawData = decoded[1];

		if(rawData !== null) {
			self["postMessage"]({
				"sessionId":	data["sessionId"],
				"buffer":		buffer,
				"data":			rawData
			}, [buffer, rawData["titleBuffer"], rawData["commentBuffer"]]);
		} else {
			self["postMessage"]({
				"sessionId":	data["sessionId"],
				"buffer":		buffer,
				"data":			rawData
			}, [buffer]);
		}
	};
}

}();