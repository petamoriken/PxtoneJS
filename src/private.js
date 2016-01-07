export function createPrivateStorage() {
	const wm = new WeakMap();
	return self => wm.get(self) || wm.set(self, Object.create(null)).get(self);
}