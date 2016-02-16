import "./polyfill";

import textDecoder from "./textDecoder";
import { checkArguments, getAptSampleRate } from "./value";


const Worker = global.Worker || (() => {});

function uint8SetAscii(offset, str) {
	const strLength = str.length;
	const strArray = new Uint8Array(strLength);

	for(let i=0; i<strLength; ++i) {
		strArray[i] = str.charCodeAt(i);
	}

	this.set(strArray, offset);
}

function setAudioBuffer(channel, bps, outputLength, inputuint8, inputint16, outputArrayOfFloat32) {
	if(channel === 2) {
		if(bps === 8) {
			for(let i=0, l=outputLength/2; i<l; ++i) {
				outputArrayOfFloat32[0][i] = (inputuint8[2*i  ] - 128) / 128;
				outputArrayOfFloat32[1][i] = (inputuint8[2*i+1] - 128) / 128;
			}
		} else {
			for(let i=0, l=outputLength/2; i<l; ++i) {
				outputArrayOfFloat32[0][i] = inputint16[2*i  ] / 32768;
				outputArrayOfFloat32[1][i] = inputint16[2*i+1] / 32768;
			}
		}
	} else {
		if(bps === 8) {
			for(let i=0, l=outputLength; i<l; ++i) {
				outputArrayOfFloat32[0][i] = (inputuint8[i] - 128) / 128;
			}
		} else {
			for(let i=0, l=outputLength; i<l; ++i) {
				outputArrayOfFloat32[0][i] = inputint16[i] / 32768;
			}

		}
	}
}

function decodeBuffer(ctx, pcmBuffer, ch, sps, bps) {
	// pcm
	const [pcmArray, pcmLength] = [new Uint8Array(pcmBuffer), pcmBuffer.byteLength];

	// wave
	const waveBuffer = new ArrayBuffer(44 + pcmLength);
	const [waveArray, waveView] = [new Uint8Array(waveBuffer), new DataView(waveBuffer)];
	
	// wave functions
	const [viewProto] = [DataView.prototype];
	const [waveSetAscii, waveSetUint16, waveSetUint32] = [uint8SetAscii.bind(waveArray), viewProto.setUint16.bind(waveView), viewProto.setUint32.bind(waveView)];

	waveSetAscii(0, "RIFF");
	waveSetUint32(4, 44 + pcmLength, true);
	waveSetAscii(8, "WAVE");

	waveSetAscii(12, "fmt ");
	waveSetUint32(16, 16, true);
	waveSetUint16(20, 1, true);						// Linear PCM
	waveSetUint16(22, ch, true);					// channel
	waveSetUint32(24, sps, true);					// SampleRate
	waveSetUint32(28, sps * bps * ch / 8, true);	// Bytes Per Sec
	waveSetUint16(32, bps * ch, true);				// Block Size
	waveSetUint16(34, bps, true);					// Bits Per Sec

	waveSetAscii(36, "data");
	waveSetUint32(40, pcmLength, true);
	waveArray.set(pcmArray, 44);

	if(ctx === null) {
		return Promise.resolve(waveBuffer);
	}

	return ctx.decodeAudioData(waveBuffer).catch(() => {
		// for Firefox in OS X https://bugzilla.mozilla.org/show_bug.cgi?id=864780
		const audioBuffer = ctx.createBuffer(ch, pcmLength / ch, sps);

		const outputChannel = [];
		for(let i=0; i<ch; ++i)	{
			outputChannel.push( audioBuffer.getChannelData(i) );
		}
		const pcmArray16 = new Int16Array(pcmBuffer);
		setAudioBuffer(ch, bps, pcmLength, pcmArray, pcmArray16, outputChannel);

		return audioBuffer;
	});
}

const getId = (() => {
	let id = 0;
	return function getId() {
		return ++id;
	}
})();


export default function createDecoder(pxtnDecoder) {

	function modifyBuffer(type, buffer, ch, sps, bps) {
		if(pxtnDecoder instanceof Worker) {
			// worker
			return new Promise(resolve => {

				const sessionId = getId();

				pxtnDecoder.addEventListener("message", function onmessage(e) {
					const data = e.data;
					if(sessionId === data.sessionId) {
						resolve([data.buffer, data.data]);
						pxtnDecoder.removeEventListener("message", onmessage);
					}
				});

				pxtnDecoder.postMessage({
					sessionId,
					type,
					buffer,
					ch,
					sps,
					bps
				});

			});
		} else {
			// function
			return Promise.resolve( pxtnDecoder(type, buffer, ch, sps, bps) );
		}
	}

	return async function decode(ctx, type, buffer, ch = 2, sps = null, bps = 16) {
		// check arguments
		checkArguments(ctx, type, buffer, ch, sps, bps);

		// set SampleRate
		if(sps === null) {
			sps = getAptSampleRate(ctx);
		}

		const [pcmBuffer, rawData] = await modifyBuffer(type, buffer, ch, sps, bps);
		const retBuffer = await decodeBuffer(ctx, pcmBuffer, ch, sps, bps);

		// Pxtone
		if(rawData) {
			const data = {
				loopStart:	rawData.loopStart,
				loopEnd:	rawData.loopEnd,
				title:		await textDecoder(rawData.titleBuffer),
				comment:	await textDecoder(rawData.commentBuffer)
			}
			return [retBuffer, data];
		}

		return retBuffer;
	}
	
}

