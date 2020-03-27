export function checkArguments(ctx, type, buffer, ch, sps, bps) {

    if (ctx !== null && !(ctx != null && ctx.decodeAudioData && ctx.sampleRate)) {
        throw new TypeError("Invalid AudioContext");
    }

    switch (type) {
        case "noise":
        case "pxtone":
        case "stream":
            break;
        default:
            throw new RangeError("Invalid type string (require noise|pxtone|stream)");
    }

    if (!(buffer instanceof ArrayBuffer)) {
        throw new TypeError("Invalid ArrayBuffer");
    }

    switch (ch) {
        case 1:
        case 2:
            break;
        default:
            throw new RangeError("Invalid channel value (require 1 or 2)");
    }

    switch (sps) {
        case 44100:
        case 22050:
        case 11025:
        case null:
            break;
        default:
            throw new RangeError("Invalid SampleRate value (require 44100 or 22050 or 11025 or null)");
    }

    switch (bps) {
        case 8:
        case 16:
            break;
        default:
            throw new RangeError("Invalid BitsParSample value (require 8 or 16)");
    }
}

export function checkAudioContext(ctx) {
    if (!(ctx != null && ctx.decodeAudioData && ctx.sampleRate))
        throw new RangeError("Invalid arguments: audioContext must be AudioContext");
}

export function getAptSampleRate(ctx) {
    const sps = ctx === null ? 0 : ctx.sampleRate;
    switch (sps) {
        case 44100:
        case 22050:
        case 11025:
            return sps;
        default:
            return 44100;
    }
}