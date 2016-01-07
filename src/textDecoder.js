// Text Decoder
export default function textDecoder(arraybuffer, charset = "utf-8") {
	if(arraybuffer.byteLength === 1 && (new Uint8Array(arraybuffer))[0] === 255)
		return Promise.resolve("");

	return new Promise((resolve) => {
		// Encoding API
		const decoder = new TextDecoder(charset);
		resolve(decoder.decode(arraybuffer));
	}).catch(() => {
		// FileReader API
		return new Promise((resolve) => {
			const blob = new Blob([arraybuffer], {type:`text/plain;charset=${charset}`});
			const reader = new FileReader();
			reader.onload = function() {
				resolve(this.result);
			};
			reader.readAsText(blob, charset);
		});
	});
}