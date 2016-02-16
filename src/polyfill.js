// for browser
import "promise-decode-audio-data";

// for node
const AudioContext = require("web-audio-api").AudioContext;
if(AudioContext) {

	const ctx = new AudioContext();
	ctx._kill();

	const noop = () => {};
	const isPromiseBased = ctx.decodeAudioData(new Uint32Array([ 1179011410, 48, 1163280727, 544501094, 16, 131073, 44100, 176400, 1048580, 1635017060, 8, 0, 0, 0, 0 ]).buffer, noop, noop);

	if(!isPromiseBased) {
		const original = AudioContext.prototype.decodeAudioData;

		AudioContext.prototype.decodeAudioData = function(audioData, successCallback, errorCallback) {
			const promise = new Promise((resolve, reject) => {
				original.call(this, audioData, resolve, reject);
			});
			promise.then(successCallback, errorCallback);

			return promise;
		}

		AudioContext.prototype.decodeAudioData.original = original;
	}

}