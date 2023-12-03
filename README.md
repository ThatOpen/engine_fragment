<p align="center">
  <a href="https://thatopen.com/">TOC</a>
  |
  <a href="https://docs.thatopen.com/intro">documentation</a>
  |
  <a href="https://platform.thatopen.com/app">demo</a>
  |
  <a href="https://people.thatopen.com/">community</a>
  |
  <a href="https://www.npmjs.com/package/bim-fragment">npm package</a>
</p>

![cover](resources/cover.png)

<h1>BIM Fragment <img src="https://ifcjs.github.io/components/resources/favicon.ico" width="32"></h1>

[![NPM Package][npm]][npm-url]
[![NPM Package][npm-downloads]][npm-url]
[![Tests](https://github.com/IFCjs/components/actions/workflows/tests.yml/badge.svg)](https://github.com/IFCjs/components/actions/workflows/tests.yaml)

This library is a geometric system to efficiently display 3D BIM data built on top of [Three.js](https://github.com/mrdoob/three.js/). Specifically, it uses [InstancedMeshes](https://threejs.org/docs/#api/en/objects/InstancedMesh) to draw each set of repeated geometries (which are abundant in BIM models) using a single draw call. 

- It uses [flatbuffers](https://flatbuffers.dev/) to persist data as a binary format efficiently.
- It prevents [memory leaks](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects) exposing a `dispose()` method.

You generally won't need to interact with this library direclty. Instead, you can use [components](https://github.com/ifcjs/components), which provides an abstraction layer of tools that use this format and make the creation of BIM tools very easy.

### Usage

You need to be familiar with [Three.js API](https://github.com/mrdoob/three.js/) to be able to use this library effectively. In the following example, we will create a cube in a 3D scene that can be navigated with the mouse or touch events. You can see the full example [here](https://github.com/IFCjs/components/blob/main/src/core/SimpleScene/index.html) and the deployed app [here](https://ifcjs.github.io/components/src/core/SimpleScene/index.html).

```js
import * as FRAGS from 'bim-fragment';

const canvas = document.getElementById('container');

// Simple three.js scene: check the resources folder of this repo
const threeScene = new SimpleThreeScene(canvas);

let chairs;

const serializer = new FRAGS.Serializer();

async function importChairsBinary() {
  if (chairs !== undefined) return;
  const fetched = await fetch("../resources/chairs.frag");
  const rawData = await fetched.arrayBuffer();
  const buffer = new Uint8Array(rawData);
  chairs = serializer.import(buffer);

  for(const frag of chairs) {
    threeScene.scene.add(frag.mesh);
  }
}

function deleteChairs() {
  if (!chairs) return;
  for(const frag of chairs) {
    frag.dispose(true);
  }
  chairs = undefined;
}

async function exportChairsBinary() {
  if (!chairs) return;

  const buffer = serializer.export(chairs);
  const file = new File([new Blob([buffer])], "chairs.frag");
  const link = document.createElement('a');
  document.body.appendChild(link);

  link.download = 'chairs.frag';
  link.href = URL.createObjectURL(file);
  link.click();

  link.remove();
}
```



[npm]: https://img.shields.io/npm/v/bim-fragment
[npm-url]: https://www.npmjs.com/package/bim-fragment
[npm-downloads]: https://img.shields.io/npm/dw/bim-fragment
