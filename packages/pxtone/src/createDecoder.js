import { checkArguments, getAptSampleRate } from "./value";
import { decodeAudio } from "./buffer";
import wrapWorker from "./wrapWorker";


export default function createDecoder(pxtnDecoder) {

    const decoder = wrapWorker(pxtnDecoder);

    return async function decode(ctx, type, buffer, ch = 2, sps = null, bps = 16) {
        // check arguments
        checkArguments(ctx, type, buffer, ch, sps, bps);

        // set SampleRate
        if (sps === null) {
            sps = getAptSampleRate(ctx);
        }

        let ret;
        let retData = null;

        // pxtone, noise
        const { buffer: pcmBuffer, data } = await decoder(type, buffer, ch, sps, bps);
        const audioBuffer = await decodeAudio(ctx, pcmBuffer, ch, sps, bps);

        // remove "byteLength" of data
        if(data) {
            retData = {
                loopStart:  data.loopStart,
                loopEnd:    data.loopEnd,
                title:      data.title,
                comment:    data.comment
            };
        }

        ret = { buffer: audioBuffer, data: retData };

        return ret;
    };

}