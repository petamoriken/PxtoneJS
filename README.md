<br><br><br><br>

<div align="center">
	<img src="pxtonejs5x.png" alt="PxtoneJS"><br>
	Play <a href="http://studiopixel.sakura.ne.jp/pxtone/" target="_blank">Pxtone Collage</a> files in Web Audio API.
</div>

<br><br><br><br>

<p align="center">
	<a href="https://github.com/petamoriken/PxtoneJS/blob/master/LICENSE" target="_blank"><img src="https://img.shields.io/npm/l/pxtone.svg?style=flat-square" alt="License"></a>
	<a href="https://github.com/petamoriken/PxtoneJS/issues" target="_blank"><img src="https://img.shields.io/github/issues/petamoriken/PxtoneJS.svg?style=flat-square" alt="Github issues"></a>
	<a href="https://david-dm.org/petamoriken/pxtonejs" target="_blank"><img src="https://david-dm.org/petamoriken/pxtonejs.svg?style=flat-square" alt="Dependency Status"></a><br>
	<a href="https://www.npmjs.com/package/pxtone" target="_blank"><img src="https://img.shields.io/npm/v/pxtone.svg?style=flat-square" alt="npm Version"></a>
	<a href="https://www.npmjs.com/package/pxtone" target="_blank"><img src="https://img.shields.io/npm/dt/pxtone.svg?style=flat-square" alt="npm Downloads"></a>
	<a href="https://github.com/petamoriken/PxtoneJS/releases/latest" target="_blank"><img src="https://img.shields.io/github/release/petamoriken/PxtoneJS.svg?style=flat-square" alt="release Version"></a>
	<a href="https://github.com/petamoriken/PxtoneJS/releases" target="_blank"><img src="https://img.shields.io/github/downloads/petamoriken/PxtoneJS/total.svg?style=flat-square" alt="release Downloads"></a>
</p>



## Demo

<a href="http://codepen.io/petamoriken/pen/JGWQOE/?editors=001" target="_blank">PxtoneJS Demo</a>  
※ JavaScript は ES6 で書いており、 Babel を使って ES5 のコードにトランスパイルして実行しています。そのままブラウザにコードを移してもおそらく動きませんので注意してください。

## Install & Require

[PxtoneJS releases](https://github.com/petamoriken/PxtoneJS/releases) と [pxtnDecoder releases](https://github.com/petamoriken/pxtnDecoder/releases) から `Pxtone.js` と `pxtnDecoder.js` を適当な場所に保存して

```html
<script src="DEST/TO/Pxtone.js"></script>
<script src="DEST/TO/pxtnDecoder.js"></script>
```

としてください。  
デコーダーを Web Worker として使う場合（推奨）は

```html
<script src="DEST/TO/Pxtone.js"></script>
<script>
	var pxtnDecoder = new Worker("DEST/TO/pxtnDecoder.js");
</script>
```

としてください。

## Initialize

以下のように初期化します。

```javascript
var pxtone = new Pxtone();
pxtone.decoder = pxtnDecoder;
```

## How to Use

ブラウザ上で Pxtone Collage ファイルを再生するには、`XMLHttpRequest` や `Fetch API`, `File API` などで Pxtone Collage Project ファイル（拡張子 .ptcop）か Pxtone Tune ファイル（拡張子 .pttune) の `ArrayBuffer` を取得する必要があります。仮に `arrayBuffer` という変数に得た Pxtone Collage ファイル の `ArrayBuffer` を入れた場合、以下のようにして `AudioBuffer` を得ることが出来ます。

```javascript
var ctx = new (window.AudioContext || window.webkitAudioContext)();
pxtone.decodePxtoneData(ctx, arrayBuffer).then(function(obj) {
  var audioBuffer = obj.buffer;
  var data = obj.data;
});
```

得た `AudioBuffer` を再生するには `AudioBufferSourceNode` を使います。詳しくは MDN の <a href="https://developer.mozilla.org/ja/docs/Web/API/Web_Audio_API/Using_Web_Audio_API" target="_blank">Web Audio APIの利用</a> や <a href="https://developer.mozilla.org/ja/docs/Web/API/AudioContext/createBufferSource" target="_blank">AudioContext.createBufferSource()</a> を参考にしてください。

## API

### AudioBuffer を作る
  
* `Pxtone#decodeNoiseData(ctx: AudioContext, buffer: ArrayBuffer, channel: number = 2, sampleRate: number = null, bitsPerSample: number = 16): Promise<{buffer: AudioBuffer, data: null}>`

  * Pxtone Noise ファイル（拡張子 .ptnoise）を `AudioBuffer` に変換します。
  * `channel` は `1`, `2` の値を、`bitsPerSample` は `8`, `16` の値のみ取ります。
  * `sampleRate` は `11025`, `22050`, `44100`, `null` の値のみ取ります。`null` のときは第一引数の `ctx` のプロパティである `ctx.sampleRate` の値を使います。ただし、それが `11025`, `22050`, `44100` のいずれでもない場合は `44100` とします。

* `Pxtone#decodePxtoneData(ctx: AudioContext, buffer: ArrayBuffer, channel: number = 2, sampleRate: number = null, bitsPerSample: number = 16): Promise<{buffer: AudioBuffer, data: Object}>`

  * Pxtone Collage Project ファイル（拡張子 .ptcop）と Pxtone Tune ファイル（拡張子 .pttune）を `AudioBuffer` に変換します。
  * `channel` は `1`, `2` の値を、`bitsPerSample` は `8`, `16` の値のみ取ります。
  * `sampleRate` は `11025`, `22050`, `44100`, `null` の値のみ取ります。`null` のときは第一引数の `ctx` のプロパティである `ctx.sampleRate` の値を使います。ただし、それが `11025`, `22050`, `44100` のいずれでもない場合は `44100` とします。
  
  * `Pxtone#decodeNoiseData` とは違い、返り値の `Promise` は `data: Object` を持ちます。`data: Object` は以下の様なプロパティを持ちます。
    * `title: string`: ファイルが持つタイトルの文字列です。
    * `comment: string`: ファイルが持つコメントの文字列です。
    * `loopStart: number`: ループ初めの位置です（Web Audio API の `AudioBufferSourceNode` に与えて使います） 。
    * `loopEnd: number`: ループ終わり位置です（Web Audio API の `AudioBufferSourceNode` に与えて使います）。

### Wave の ArrayBuffer を作る

* `Pxtone#decodeNoise(buffer: ArrayBuffer, channel: number = 2, sampleRate: number = null, bitsPerSample: number = 16): Promise<{buffer: ArrayBuffer, data: null}>`

  * Pxtone Noise ファイル（拡張子 .ptnoise）を Wave の `ArrayBuffer` に変換します。
  * 引数については `Pxtone#decodeNoiseData` と同じです。ただし `sampleRate` が `null` のときは `44100` として扱います。

* `Pxtone#decodePxtone(buffer: ArrayBuffer, channel: number = 2, sampleRate: number = null, bitsPerSample: number = 16): Promise<{buffer: ArrayBuffer, data: Object}>`

  * Pxtone Collage Project ファイル（拡張子 .ptcop）と Pxtone Tune ファイル（拡張子 .pttune）を Wave の `ArrayBuffer` に変換します。
  * 引数については `Pxtone#decodePxtoneData` と同じです。ただし `sampleRate` が `null` のときは `44100` として扱います。

## License & Dependencies

under [MIT License](LICENSE).

## Support

何か問題が起きた場合は [issues](https://github.com/petamoriken/PxtoneJS/issues) に投稿してください。  
また簡単な使い方の質問などは [@printf_moriken](https://twitter.com/printf_moriken) に気軽にどうぞ。