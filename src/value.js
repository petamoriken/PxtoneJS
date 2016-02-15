const AudioContext = self.AudioContext || self.webkitAudioContext || require("web-audio-api").AudioContext;


export function checkArguments(ctx, type, buffer, ch, sps, bps) {
	let errStr = "Invalid arguments:";
	let isErr = false;

	if(!(ctx instanceof AudioContext) && ctx !== null) {
		errStr += ` audioContext(${ ctx })`;
		isErr = true;
	}

	switch(type) {
		case "noise": case "pxtone":
			break;
		default:
			errStr += ` type(${ type })`;
			isErr = true;
	}

	if(!(buffer instanceof ArrayBuffer)) {
		errStr += ` buffer(${ buffer })`;
		isErr = true;
	}

	switch(ch) {
		case 1: case 2:
			break;
		default:
			errStr += ` channel(${ ch })`;
			isErr = true;
	}

	switch(sps) {
		case 44100: case 22050: case 11025: case null:
			break;
		default:
			errStr += ` sampleRate(${ sps })`;
			isErr = true;
	}

	switch(bps) {
		case 8: case 16:
			break;
		default:
			errStr += ` bitsPerSample(${ bps })`;
			isErr = true;
	}

	if(isErr)	throw new RangeError(errStr);
}

export function checkAudioContext(ctx) {
	if(!(ctx instanceof AudioContext))
		throw new RangeError("Invalid arguments: audioContext must be AudioContext");
}

export function getAptSampleRate(ctx) {
	const sps = ctx === null ? 0 : ctx.sampleRate;
	switch(sps) {
		case 44100: case 22050: case 11025:
			return sps;
		default:
			return 44100;
	}
}