import { createPrivateStorage } from "./private";
import createDecoder from "./createDecoder";

import { checkAudioContext } from "./value";


const _ = createPrivateStorage();

export default class Pxtone {

	// private pxtnDecoder;
	// private decoder;

	constructor() {
		// private
		const _this = _(this);

		_this.pxtnDecoder = null;
		_this.decoder = null;

		this[Symbol.toStringTag] = "Pxtone";
	}

	set decoder(pxtnDecoder) {
		// private
		const _this = _(this);

		_this.pxtnDecoder = pxtnDecoder;
		_this.decoder = createDecoder(pxtnDecoder);
	}
	get decoder() {
		return _(this).pxtnDecoder;
	}

	async decodeNoise(...args) {
		return await _(this).decoder(null, "noise", ...args);
	}

	async decodePxtone(...args) {
		return await _(this).decoder(null, "pxtone", ...args);
	}

	async decodeNoiseData(ctx, ...args) {
		checkAudioContext(ctx);
		return await _(this).decoder(ctx, "noise", ...args);
	}

	async decodePxtoneData(ctx, ...args) {
		checkAudioContext(ctx);
		return await _(this).decoder(ctx, "pxtone", ...args);
	}

	toString() {
		return `[object ${ this[Symbol.toStringTag] }]`;
	}

}

// symbol
Pxtone.prototype[Symbol.toStringTag] = "PxtonePrototype";