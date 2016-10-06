<br><br><br><br>

<div align="center">
	<img src="pxtonejs5x.png" alt="PxtoneJS"><br>
	Play <a href="http://studiopixel.sakura.ne.jp/pxtone/" target="_blank">Pxtone Collage</a> files in Web Audio API.
</div>

<br><br><br><br>

<p align="center">
	<a href="http://petamoriken.mit-license.org/2016" target="_blank"><img src="https://img.shields.io/npm/l/pxtone.svg?style=flat-square" alt="License"></a>
	<a href="https://github.com/petamoriken/PxtoneJS/issues" target="_blank"><img src="https://img.shields.io/github/issues/petamoriken/PxtoneJS.svg?style=flat-square" alt="Github issues"></a>
	<a href="https://david-dm.org/petamoriken/pxtonejs" target="_blank"><img src="https://david-dm.org/petamoriken/pxtonejs.svg?style=flat-square" alt="Dependency Status"></a><br>
	<a href="https://www.npmjs.com/package/pxtone" target="_blank"><img src="https://img.shields.io/npm/v/pxtone.svg?style=flat-square" alt="npm Version"></a>
	<a href="https://www.npmjs.com/package/pxtone" target="_blank"><img src="https://img.shields.io/npm/dt/pxtone.svg?style=flat-square" alt="npm Downloads"></a>
	<a href="https://github.com/petamoriken/PxtoneJS/releases/latest" target="_blank"><img src="https://img.shields.io/github/release/petamoriken/PxtoneJS.svg?style=flat-square" alt="release Version"></a>
	<a href="https://github.com/petamoriken/PxtoneJS/releases" target="_blank"><img src="https://img.shields.io/github/downloads/petamoriken/PxtoneJS/total.svg?style=flat-square" alt="release Downloads"></a>
</p>


##Install & Require

###Browser で鳴らす

####Browserify で使う場合

```
npm install --save pxtone
```

Browserify で require をするときには

```javascript
var Pxtone = require("pxtone");
var pxtnDecoder = require("pxtone/pxtnDecoder");
```

としてください。  
デコーダーを Web Worker として使いたい場合（推奨）は `lib/pxtnDecoder.js` を適当な場所にコピーして

```javascript
var Pxtone = require("pxtone");
var pxtnDecoder = new Worker("DEST/TO/pxtnDecoder.js");
```

としてください。

また、<a href="https://github.com/substack/webworkify" target="_blank">webworkify</a> を使えば 1 つの JavaScript ファイルとしてまとめることが出来ますが、膨大な `lib/pxtnDecoder.js` を文字列化して `URL.createObjectURL` を使って読み込むことになるため、パフォーマンス面から推奨しません。

####script タグで使う場合

[releases](https://github.com/petamoriken/PxtoneJS/releases) から `Pxtone.js` と `pxtnDecoder.js` を適当な場所に保存して

```html
<script src="DEST/TO/Pxtone.js"></script>
<script src="DEST/TO/pxtnDecoder.js"></script>
```

としてください。  
デコーダーを Web Worker として使いたい場合（推奨）は

```html
<script src="DEST/TO/Pxtone.js"></script>
<script>
	var pxtnDecoder = new Worker("DEST/TO/pxtnDecoder.js");
</script>
```

としてください。

###Node で鳴らす

```
npm install --save pxtone
npm install --save web-audio-engine
```

Node で require をするときには Browserify と同様に

```javascript
const Pxtone = require("pxtone");
const pxtnDecoder = require("pxtone/pxtnDecoder");
```

としてください。  
Node の場合は `web-audio-engine` パッケージを使うことになります。

##Initialize

以下のように初期化します。

```javascript
var pxtone = new Pxtone();
pxtone.decoder = pxtnDecoder;
```

##How to Use

ブラウザ上で Pxtone Collage ファイルを再生するには、`XMLHttpRequest` や `Fetch API`, `File API` などで Pxtone Collage Project ファイル（拡張子 .ptcop）か Pxtone Tune ファイル（拡張子 .pttune) の `ArrayBuffer` を取得する必要があります。仮に `arrayBuffer` という変数に得た Pxtone Collage ファイル の `ArrayBuffer` を入れた場合、以下のようにして `AudioBuffer` を得ることが出来ます。

```javascript
var ctx = new (window.AudioContext || window.webkitAudioContext)();
pxtone.decodePxtoneData(ctx, arrayBuffer).then(function(arr) {
  var audioBuffer = arr[0];
  var data = arr[1];
});
```

得た `AudioBuffer` を再生するには `AudioBufferSourceNode` を使います。詳しくは MDN の <a href="https://developer.mozilla.org/ja/docs/Web/API/Web_Audio_API/Using_Web_Audio_API" target="_blank">Web Audio APIの利用</a> や <a href="https://developer.mozilla.org/ja/docs/Web/API/AudioContext/createBufferSource" target="_blank">AudioContext.createBufferSource()</a> を参考にしてください。

##Browser Support

以下のブラウザ環境で動作することを確認しています。

Windows 10: Chrome 47, Firefox 43, Opera 34, Edge 25 (EdgeHTML 13)  
OS X v10.8: Chrome 47, Firefox 43, Opera 34, Safari 6  
iOS 9.2: Mobile Safari

上記に書いてないブラウザ環境でも Web Audio API が動く環境であれば動作すると思われます。
動作する環境について調べたい場合は Can I use の [Web Audio API](http://caniuse.com/#feat=audio-api) を御覧ください。

特にデフォルトで asm.js をサポートしている Firefox, Edge では速くデコードすることが出来ます。
将来的には WebAssembly によって、どのブラウザでも速くデコードすることが出来るようになると思われます。

また IE は Web Audio API を使うことが出来ませんが、<a href="http://www.g200kg.com/docs/waapisim/" target="_blank">WAAPISim</a> を使うことで動作する可能性があります。

##Demo

<a href="http://codepen.io/petamoriken/pen/JGWQOE/?editors=001" target="_blank">PxtoneJS Demo</a>  
※ JavaScript は ES6 で書いており、 Babel を使って ES5 のコードにトランスパイルして実行しています。そのままブラウザにコードを移してもおそらく動きませんので注意してください。

##API

###AudioBuffer を作る
  
* `Pxtone#decodeNoiseData(ctx: AudioContext, buffer: ArrayBuffer, channel: number = 2, sampleRate: number = null, bitsPerSample: number = 16): Promise.resolve(audioBuffer: AudioBuffer)`

  * Pxtone Noise ファイル（拡張子 .ptnoise）を `AudioBuffer` に変換します。
  * `channel` は `1`, `2` の値を、`bitsPerSample` は `8`, `16` の値のみ取ります。
  * `sampleRate` は `11025`, `22050`, `44100`, `null` の値のみ取ります。`null` のときは第一引数の `ctx` のプロパティである `ctx.sampleRate` の値を使います。ただし、それが `11025`, `22050`, `44100` のいずれでもない場合は `44100` とします。

* `Pxtone#decodePxtoneData(ctx: AudioContext, buffer: ArrayBuffer, channel: number = 2, sampleRate: number = null, bitsPerSample: number = 16): Promise.resolve([audioBuffer: AudioBuffer, data: Object])`

  * Pxtone Collage Project ファイル（拡張子 .ptcop）と Pxtone Tune ファイル（拡張子 .pttune）を `AudioBuffer` に変換します。
  * `channel` は `1`, `2` の値を、`bitsPerSample` は `8`, `16` の値のみ取ります。
  * `sampleRate` は `11025`, `22050`, `44100`, `null` の値のみ取ります。`null` のときは第一引数の `ctx` のプロパティである `ctx.sampleRate` の値を使います。ただし、それが `11025`, `22050`, `44100` のいずれでもない場合は `44100` とします。
  
  * `Pxtone#decodeNoiseData` とは違い、返り値の `Promise` は `AudioBuffer` と `Object` を持つ長さ 2 の配列を `resolve` します。そして、その 2 つ目の要素である `Object` は以下の様なプロパティを持ちます。
    * `title: string`: ファイルが持つタイトルの文字列です。
    * `comment: string`: ファイルが持つコメントの文字列です。
    * `loopStart: number`: ループ初めの位置です（Web Audio API の `AudioBufferSourceNode` に与えて使います） 。
    * `loopEnd: number`: ループ終わり位置です（Web Audio API の `AudioBufferSourceNode` に与えて使います）。

###Wave の ArrayBuffer を作る

* `Pxtone#decodeNoise(buffer: ArrayBuffer, channel: number = 2, sampleRate: number = null, bitsPerSample: number = 16): Promise.resolve(waveBuffer: ArrayBuffer)`

  * Pxtone Noise ファイル（拡張子 .ptnoise）を Wave の `ArrayBuffer` に変換します。
  * 引数については `Pxtone#decodeNoiseData` と同じです。ただし `sampleRate` が `null` のときは `44100` として扱います。

* `Pxtone#decodePxtone(buffer: ArrayBuffer, channel: number = 2, sampleRate: number = null, bitsPerSample: number = 16): Promise.resolve([waveBuffer: ArrayBuffer, data: Object])`

  * Pxtone Collage Project ファイル（拡張子 .ptcop）と Pxtone Tune ファイル（拡張子 .pttune）を Wave の `ArrayBuffer` に変換します。
  * 引数については `Pxtone#decodePxtoneData` と同じです。ただし `sampleRate` が `null` のときは `44100` として扱います。

##Side Effect

<a href="https://github.com/mohayonao/promise-decode-audio-data" target="_blank">promise-decode-audio-data</a> に依存しているため、`AudioContext#decodeAudioData` が `Promise` を返すようになります。

##License & Dependencies

under <a href="http://petamoriken.mit-license.org/2016" target="_blank">MIT License</a>.

ソースファイルとして含まれたライブラリは以下の通りです。

* [pxtone_source](pxtone_source): Copyright (c) 2016 <a href="http://studiopixel.sakura.ne.jp/" target="_blank">STUDIO PIXEL</a> under [MIT License](pxtone_source/LICENSE.txt).  
* [pxtone_source/src-oggvorbis](pxtone_source/src-oggvorbis): Copyright (c) 2002-2015 <a href="http://xiph.org/" target="_blank">Xiph.org Foundation</a> under [3-clause BSD license](pxtone_source/src-oggvorbis/COPYING).

ビルドするのに以下のライブラリが使われています。

* <a href="http://kripken.github.io/emscripten-site/" href="_target">Emscripten</a>: An LLVM-to-JavaScript Compiler
* <a href="http://babeljs.io/" href="_target">Babel</a>: a compiler for writing next generation JavaScript
  * <a href="https://github.com/zloirock/core-js" href="_target">core-js</a> (babel-runtime): Modular standard library for JavaScript
* <a href="http://browserify.org/" href="_target">Browserify</a>: require('modules') in the browser by bundling up all of your dependencies
* <a href="http://lisperator.net/uglifyjs/" href="_target">UglifyJS</a>: JavaScript parser / mangler / compressor / beautifier toolkit
* <a href="https://github.com/nolanlawson/optimize-js" href="_target">optimize-js</a>: Optimize a JavaScript file for faster initial load by wrapping eagerly-invoked functions

その他の依存する npm パッケージについては [package.json](package.json) を御覧ください。

##Support

何か問題が起きた場合は [issues](https://github.com/petamoriken/PxtoneJS/issues) に投稿してください。  
また簡単な使い方の質問などは [@printf_moriken](https://twitter.com/printf_moriken) に気軽にどうぞ。