<div align="center" style="margin:5em auto;">
	<img src="pxtonejs5x.png" alt="PxtoneJS"><br>
	Play <a href="http://studiopixel.sakura.ne.jp/pxtone/" target="_blank">Pxtone Collage</a> files in Browser.
</div>

<p align="center">
	<a href="https://www.npmjs.com/package/pxtone" target="_blank"><img src="https://img.shields.io/npm/v/pxtone.svg" alt="npm Version"></a>
	<a href="http://petamoriken.mit-license.org/2016" target="_blank"><img src="https://img.shields.io/npm/l/pxtone.svg" alt="License"></a>
	<a href="https://www.npmjs.com/package/pxtone" target="_blank"><img src="https://img.shields.io/npm/dt/pxtone.svg" alt="npm Downloads"></a>
	<a href="https://david-dm.org/petamoriken/pxtonejs" target="_blank"><img src="https://david-dm.org/petamoriken/pxtonejs.svg" alt="Dependency Status"></a>
</p>


##Install & Require

###browserify で使う場合

```
npm install --save-dev pxtone
```

Browserify で require をするときには

```javascript
var Pxtone = require("pxtone");
var pxtnDecoder = require("pxtone/pxtnDecoder");
```
としてください。  
デコーダーを Web Worker として使いたい場合（推奨）は `lib/pxtnDecoder.js` を適当な場所にコピーして

```javascript
var Pxtone = require("pxtone/lib");
var pxtnDecoder = new Worker("DEST/TO/pxtnDecoder.js");
```

としてください。

###script タグで使う場合

`build` フォルダの中身を適当な場所にコピーして

```html
<script src="DEST/TO/Pxtone.js"></script>
<script src="DEST/TO/pxtnDecoder.js"></script>
```

デコーダーを Web Worker として使いたい場合（推奨）は

```html
<script src="DEST/TO/pxtone.js"></script>
<script>
	var pxtnDecoder = new Worker("DEST/TO/pxtnDecoder.js");
</script>
```

としてください。

##Initialize

`Pxtone` を使う場合は、以下のように初期化してください。

```javascript
var pxtone = new Pxtone();
pxtone.decoder = pxtnDecoder;
```

##How to Use

ブラウザ上で Pxtone Collage ファイルを再生するには、`XMLHttpRequest` や `Fetch API`, `FileReader API` などで Pxtone Collage Project ファイル（拡張子 .ptcop）か Pxtone Tune ファイル（拡張子 .pttune) の `ArrayBuffer` を取得する必要があります。仮に `buffer` という変数に得た `ArrayBuffer` を入れた場合、以下のようにして `AudioBuffer` を得ることが出来ます。

```javascript
var ctx = new (window.AudioContext || window.webkitAudioContext)();
pxtone.decodePxtoneData(ctx, buffer).then(function(arr) {
  var audiobuffer = arr[0];
  var data = arr[1];
});
```

得た `AudioBuffer` を再生するには `AudioBufferSourceNode` を使います。詳しくは MDN の <a href="https://developer.mozilla.org/ja/docs/Web/API/Web_Audio_API/Using_Web_Audio_API" target="_blank">Web Audio APIの利用</a> や <a href="https://developer.mozilla.org/ja/docs/Web/API/AudioContext/createBufferSource" target="_blank">AudioContext.createBufferSource()</a> を参考にしてください。

##Demo

<a href="http://codepen.io/petamoriken/pen/JGWQOE/" target="_blank">PxtoneJS Demo</a>  
※ クロスオリジンの問題があり Web Worker が使用できないため、デコードの処理でブラウザが固まってしまいます。JavaScript は ES6 で書いており、 Babel を使って ES5 のコードにトランスパイルして実行しています。そのままブラウザにコードを移してもおそらく動きませんので注意してください。

##API

###AudioBuffer を作る
  
* `Pxtone#decodeNoiseData(ctx: AudioContext, buffer: ArrayBuffer, channel: Number = 2, sampleRate: Number = null, bitsPerSample: Number = 16): Promise.resolve(audioBuffer: AudioBuffer)`

  * Pxtone Noise ファイル（拡張子 .ptnoise）を `AudioBuffer` に変換します。
  * `channel` は `1, 2` の値を、`bitsPerSample` は `8, 16` の値のみ取ります。
  * `sampleRate` は `44100, 22050, 11025, null` の値のみ取ります。
  * `sampleRate` が `null` のときは第一引数の `ctx` のプロパティである `ctx.sampleRate` の値を使います。ただし、それが `44100, 22050, 11025` のいずれでもない場合は `44100` とします。

* `Pxtone#decodePxtoneData(ctx: AudioContext, buffer: ArrayBuffer, channel: Number = 2, sampleRate: Number = null, bitsPerSample: Number = 16): Promise.resolve([audioBuffer: AudioBuffer, data: Object])`

  * Pxtone Collage Project ファイル（拡張子 .ptcop）と Pxtone Tune ファイル（拡張子 .pttune）を `AudioBuffer` に変換します。
  * `channel` は `1, 2` の値を、`bitsPerSample` は `8, 16` の値のみ取ります。
  * `sampleRate` は `44100, 22050, 11025, null` の値のみ取ります。
  * `sampleRate` が `null` のときは第一引数の `ctx` のプロパティである `ctx.sampleRate` の値を使います。ただし、それが `44100, 22050, 11025` のいずれでもない場合は `44100` とします。
  
  * `Pxtone#decodeNoiseData` とは違い、返り値の `Promise` は `AudioBuffer` と `Object` を持つ長さ 2 の配列を `resolve` します。そして、その 2 つ目の要素である `Object` は以下の様なプロパティを持ちます。
    * `title: String`: ファイルが持つタイトルの文字列です。
    * `comment: String`: ファイルが持つコメントの文字列です。
    * `loopStart: Number`: ループ初めの位置です（Web Audio API の `AudioBufferSourceNode` に与えて使います） 。
    * `loopEnd: Number`: ループ終わり位置です（Web Audio API の `AudioBufferSourceNode` に与えて使います）。

###Wave の ArrayBuffer を作る

* `Pxtone#decodeNoise(buffer: ArrayBuffer, channel: Number = 2, sampleRate: Number = null, bitsPerSample: Number = 16): Promise.resolve(waveBuffer: ArrayBuffer)`

  * Pxtone Noise ファイル（拡張子 .ptnoise）を Wave の `ArrayBuffer` に変換します。
  * 引数については `Pxtone#decodeNoiseData` と同じです。ただし `sampleRate` が `null` のときは `44100` として扱います。

* `Pxtone#decodePxtone(buffer: ArrayBuffer, channel: Number = 2, sampleRate: Number = null, bitsPerSample: Number = 16): Promise.resolve([waveBuffer: ArrayBuffer, data: Object])`

  * Pxtone Collage Project ファイル（拡張子 .ptcop）と Pxtone Tune ファイル（拡張子 .pttune）を Wave の `ArrayBuffer` に変換します。
  * 引数については `Pxtone#decodePxtoneData` と同じです。ただし `sampleRate` が `null` のときは `44100` として扱います。

##Side Effect

<a href="https://github.com/mohayonao/promise-decode-audio-data" target="_blank">promise-decode-audio-data</a> に依存しているため、`AudioContext#decodeAudioData` が `Promise` を返すようになります。

##License

under <a href="http://petamoriken.mit-license.org/2016" target="_blank">MIT License</a>.

依存するライブラリについては以下の通りです。

`pxtone_source`: Copyright (c) 2016 <a href="http://studiopixel.sakura.ne.jp/" target="_blank">STUDIO PIXEL</a> under [MIT License](pxtone_source/LICENSE.txt).  
`pxtone_source/src-oggvorbis`: Copyright (c) 2002-2015 <a href="http://xiph.org/" target="_blank">Xiph.org Foundation</a> under [3-clause BSD license](pxtone_source/src-oggvorbis/COPYING).
