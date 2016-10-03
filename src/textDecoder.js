const TextDecoder = global.TextDecoder || require("text-encoding").TextDecoder;

export default function textDecoder(arraybuffer, charset = "shift_jis") {
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