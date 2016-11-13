import Observable from "zen-observable";

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

                    const stream = (type === "stream") ? new Observable(observer => {
                        function handler(e) {
                            const data = e.data;
                            if(sessionId !== data.sessionId) return;

                            if(data.done) {
                                observer.complete();
                                pxtnDecoder.removeEventListener("message", handler);
                            }

                            observer.next(data.streamBuffer);
                        }

                        pxtnDecoder.addEventListener("message", handler);

                        return () => {
                            pxtnDecoder.removeEventListener("message", handler);
                        };
                    }) : null;
                    
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