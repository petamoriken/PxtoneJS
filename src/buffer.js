function setAudioBuffer(channel, bps, outputLength, inputuint8, inputint16, outputArrayOfFloat32) {
    if (channel === 2) {
        if (bps === 8) {
            for (let i = 0, l = outputLength / 2; i < l; ++i) {
                outputArrayOfFloat32[0][i] = (inputuint8[2 * i] - 128) / 128;
                outputArrayOfFloat32[1][i] = (inputuint8[2 * i + 1] - 128) / 128;
            }
        } else {
            for (let i = 0, l = outputLength / 2; i < l; ++i) {
                outputArrayOfFloat32[0][i] = inputint16[2 * i] / 32768;
                outputArrayOfFloat32[1][i] = inputint16[2 * i + 1] / 32768;
            }
        }
    } else {
        if (bps === 8) {
            for (let i = 0, l = outputLength; i < l; ++i) {
                outputArrayOfFloat32[0][i] = (inputuint8[i] - 128) / 128;
            }
        } else {
            for (let i = 0, l = outputLength; i < l; ++i) {
                outputArrayOfFloat32[0][i] = inputint16[i] / 32768;
            }
        }
    }
}

function uint8SetAscii(offset, str) {
    const strLength = str.length;
    const strArray = new Uint8Array(strLength);

    for (let i = 0; i < strLength; ++i) {
        strArray[i] = str.charCodeAt(i);
    }

    this.set(strArray, offset);
}

export const WAVE_HEADER_SIZE = 44;

export function setWaveHeader(waveBuffer, ch, sps, bps, byteLength) {
    // wave
    const [waveArray, waveView] = [new Uint8Array(waveBuffer), new DataView(waveBuffer)];

    // wave functions
    const [viewProto] = [DataView.prototype];
    const [waveSetAscii, waveSetUint16, waveSetUint32] = [uint8SetAscii.bind(waveArray), viewProto.setUint16.bind(waveView), viewProto.setUint32.bind(waveView)];

    waveSetAscii(0, "RIFF");
    waveSetUint32(4, WAVE_HEADER_SIZE + byteLength, true);
    waveSetAscii(8, "WAVE");

    waveSetAscii(12, "fmt ");
    waveSetUint32(16, 16, true);
    waveSetUint16(20, 1, true); // Linear PCM
    waveSetUint16(22, ch, true); // channel
    waveSetUint32(24, sps, true); // SampleRate
    waveSetUint32(28, sps * bps * ch / 8, true); // Bytes Per Sec
    waveSetUint16(32, bps * ch, true); // Block Size
    waveSetUint16(34, bps, true); // Bits Per Sec

    waveSetAscii(36, "data");
    waveSetUint32(40, byteLength, true);
}

export function decodeAudio(ctx, pcmBuffer, ch, sps, bps) {
    // pcm
    const [pcmArray, pcmLength] = [new Uint8Array(pcmBuffer), pcmBuffer.byteLength];

    // wave
    const waveBuffer = new ArrayBuffer(WAVE_HEADER_SIZE + pcmLength);
    const waveArray = new Uint8Array(waveBuffer);

    setWaveHeader(waveBuffer, ch, sps, bps, pcmLength);
    waveArray.set(pcmArray, WAVE_HEADER_SIZE);

    if (ctx === null) {
        return Promise.resolve(waveBuffer);
    }

    return ctx.decodeAudioData(waveBuffer).catch(() => {
        // for Firefox in OS X https://bugzilla.mozilla.org/show_bug.cgi?id=864780
        const audioBuffer = ctx.createBuffer(ch, pcmLength / ch, sps);

        const outputChannel = [];
        for (let i = 0; i < ch; ++i) {
            outputChannel.push(audioBuffer.getChannelData(i));
        }
        const pcmArray16 = new Int16Array(pcmBuffer);
        setAudioBuffer(ch, bps, pcmLength, pcmArray, pcmArray16, outputChannel);

        return audioBuffer;
    });
}