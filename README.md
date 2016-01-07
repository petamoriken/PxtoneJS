<div align="center"><img src="pxtonejs5x.png" alt="PxtoneJS"></div>

<p align="center">
	Play Pxtone Collage files in Browser.
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
<script src="DEST/TO/PxtnDecoder.js"></script>
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

##API

###AudioBuffer を作る
  
* `Pxtone#decodeNoiseData(ctx: AudioContext, buffer: ArrayBuffer, channel: Number = 2, sampleRate: Number = null, bitsPerSample: Number = 16): Promise.resolve(audioBuffer: AudioBuffer)`

  * Pxtone Noise ファイル（拡張子 .ptnoise）を `AudioBuffer` に変換します。
  * `channel` は `1, 2` の値を、`bitsPerSample` は `8, 16` の値のみ取ります。
  * `sampleRate` は `44100, 22050, 11025, null` の値のみ取ります。
  * `sampleRate` が `null` のときは第一引数の `ctx` のプロパティである `ctx.sampleRate` の値を使います。ただし、それが `44100, 22050, 11025` でない場合は `44100` とします。

* `Pxtone#decodePxtoneData(ctx: AudioContext, buffer: ArrayBuffer, channel: Number = 2, sampleRate: Number = null, bitsPerSample: Number = 16): Promise.resolve([audioBuffer: AudioBuffer, data: Object])`

  * Pxtone Collage Project ファイル（拡張子 .ptcop）と Pxtone Tune ファイル（拡張子 .pttune）を `AudioBuffer` に変換します。
  * `channel` は `1, 2` の値を、`bitsPerSample` は `8, 16` の値のみ取ります。
  * `sampleRate` は `44100, 22050, 11025, null` の値のみ取ります。
  * `sampleRate` が `null` のときは第一引数の `ctx` のプロパティである `ctx.sampleRate` の値を使います。ただし、それが `44100, 22050, 11025` でない場合は `44100` とします。
  
  * `Pxtone#decodeNoiseData` とは違い、返り値の `Promise` は `AudioBuffer` と `Object` を持つ長さ 2 の配列を `resolve` します。そして、その 2 つ目の要素である `Object` は以下の様なプロパティを持ちます。
    * `title: String`: ファイルが持つタイトルの文字列です。
    * `comment: String`: ファイルが持つコメントの文字列です。
    * `loopStart: Number`: ループ初めの位置です（Web Audio API の `BufferSourceNode` に与えて使います） 。
    * `loopEnd: Number`: ループ終わり位置です（Web Audio API の `BufferSourceNode` に与えて使います）。

###Wave の ArrayBuffer を作る

* `Pxtone#decodeNoise(buffer: ArrayBuffer, channel: Number = 2, sampleRate: Number = null, bitsPerSample: Number = 16): Promise.resolve(waveBuffer: ArrayBuffer)`

  * Pxtone Noise ファイル（拡張子 .ptnoise）を Wave の `ArrayBuffer` に変換します。
  * 引数については `Pxtone#decodeNoiseData` と同じです。ただし `sampleRate` が `null` のときは `44100` として扱います。

* `Pxtone#decodePxtone(buffer: ArrayBuffer, channel: Number = 2, sampleRate: Number = null, bitsPerSample: Number = 16): Promise.resolve([waveBuffer: ArrayBuffer, data: Object])`

  * Pxtone Collage Project ファイル（拡張子 .ptcop）と Pxtone Tune ファイル（拡張子 .pttune）を Wave の `ArrayBuffer` に変換します。
  * 引数については `Pxtone#decodePxtoneData` と同じです。ただし `sampleRate` が `null` のときは `44100` として扱います。

##LICENSE

under [MIT License](http://petamoriken.mit-license.org/2016).

依存するライブラリについては、そのライブラリのライセンスを継承します。

`pxtone_source`: Copyright (c) 2016 STUDIO PIXEL under [MIT License](pxtone_source/LICENSE.txt).  
`pxtone_source/src-oggvorbis`: Copyright (c) 2002-2015 Xiph.org Foundation under [3-clause BSD license](pxtone_source/src-oggvorbis/COPYING).






