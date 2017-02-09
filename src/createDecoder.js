// polyfill
import _ReadableStream from "streams/readable-stream";

import { checkArguments, getAptSampleRate } from "./value";
import { WAVE_HEADER_SIZE, setWaveHeader, decodeAudio } from "./buffer";
import wrapWorker from "./wrapWorker";

const ReadableStream = global.ReadableStream || _ReadableStream;


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

        if (type === "pxtone" || type === "noise") {
            // pxtone, noise
            const { buffer: pcmBuffer, data } = await decoder(type, buffer, ch, sps, bps);
            const audioBuffer = await decodeAudio(ctx, pcmBuffer, ch, sps, bps);

            ret = { buffer: audioBuffer, data };
        } else if (type === "stream") {
            // stream
            const { stream: streamObserver, data } = await decoder(type, buffer, ch, sps, bps);
            const { byteLength } = data;

            let subscription;
            const stream = new ReadableStream({
                type: "bytes",
                autoAllocateChunkSize: WAVE_HEADER_SIZE + byteLength,
                start(controller) {
                    const header = new ArrayBuffer(WAVE_HEADER_SIZE);
                    setWaveHeader(header, ch, sps, bps, byteLength);
                    controller.enqueue(header);

                    subscription = streamObserver.subscribe({
                        next(streamBuffer) {
                            controller.enqueue(streamBuffer);
                        },
                        complete() {
                            controller.close();
                        }
                    });
                },
                cancel() {
                    subscription.unsubscribe();
                }
            });

            ret = { stream, data };
        }

        return ret;
    };

}