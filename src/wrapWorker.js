const Worker = global.Worker || (() => {});

const getId = (() => {
    let id = 0;
    return function getId() {
        return ++id;
    }
})();

export default function wrapWorker(pxtnDecoder) {
    return function decoder(type, buffer, ch, sps, bps) {
        if (pxtnDecoder instanceof Worker) {
            // worker
            return new Promise(resolve => {

                const sessionId = getId();

                pxtnDecoder.addEventListener("message", function onmessage(e) {
                    const data = e.data;
                    if (sessionId !== data.sessionId) return;
                    
                    const stream = type === "stream" ? (async function* stream() {
                        for(;;) {
                            const { streamBuffer, done } = await new Promise(resolve => {
                                pxtnDecoder.addEventListener("message", function onstream(e) {
                                    const data = e.data;
                                    if(sessionId !== data.sessionId) return;

                                    resolve({streamBuffer: data.streamBuffer, done: data.done});
                                    pxtnDecoder.removeEventListener("message", onstream);
                                });
                            });

                            if(done) break;
                            const cancel = yield streamBuffer;
                            if(cancel) {
                                pxtnDecoder.postMessage({
                                    sessionId,
                                    type: "cancel"
                                });
                            }
                        }
                    })() : null;
                    resolve({ buffer: data.buffer, stream, data: data.data });
                    pxtnDecoder.removeEventListener("message", onmessage);
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
            return pxtnDecoder(type, buffer, ch, sps, bps);
        }
    };
}