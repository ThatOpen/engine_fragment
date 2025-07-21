<p align="center">
  <a href="https://thatopen.com/">TOC</a>
  |
  <a href="https://docs.thatopen.com/intro">documentation</a>
  |
  <a href="https://thatopen.github.io/engine_fragment/examples/FragmentsModels/">demo</a>
  |
  <a href="https://people.thatopen.com/">community</a>
  |
  <a href="https://www.npmjs.com/package/openbim-components">npm package</a>
</p>

![cover](https://thatopen.github.io/engine_components/resources/cover.png)


<h1>Fragments <img src="https://thatopen.github.io/engine_components/resources/favicon.ico" width="32"/></h1>

[![NPM Package][npm]][npm-url]
[![NPM Package][npm-downloads]][npm-url]

Fragments is an open-source library designed to store, display, navigate, and edit massive amounts of BIM data with exceptional efficiency—on any device.

This repository contains the format and a whole toolkit to start building on top.


## 🤝 Want our help?
Are you developing a project with our technology and would like our help?
Apply now to join [That Open Accelerator Program](https://thatopen.com/accelerator)!

## 🧩 The Format
Fragments defines an open BIM format optimized for handling large datasets efficiently.

- Binary and compact for performance

- Free and open source

- Supports geometries, properties, and relationships

The format is built with [Google's FlatBuffers](https://flatbuffers.dev/), an efficient cross-platform serialization library. This means you can create your own Fragments importer/exporter in any programming language. Just refer to the FlatBuffers documentation to get started.

📄 You can find the Fragments schema [here](https://github.com/ThatOpen/engine_fragment/blob/main/packages/fragments/flatbuffers/index.fbs). It defines what kind of data Fragments can store—anything the schema supports, you can include.

This library also includes a TypeScript/JavaScript importer/exporter, so you can get up and running fast. But feel free to build your own!

That said, the easiest way to generate Fragments is by using the built-in IfcImporter, described below.


## 🚀 The 3D Engine

Fragments comes with a high-performance 3D viewer built on top of Three.js. It’s designed to handle millions of elements in seconds, making it ideal for web-based BIM applications.

With it, you can:

- Display large BIM models efficiently on any device

- Highlight, filter, raycast, and snap elements

- Retrieve properties and interact with the model


## 🔄 Importers and exporters

This library includes an IfcImporter that works both in the frontend and backend. It makes it simple to bring your IFC data into the Fragments ecosystem.

We're planning to release more importers/exporters to help integrate Fragments into a wide variety of BIM workflows.

---

Whether you're building a lightweight BIM viewer, a full-scale application, or just exploring the future of open BIM formats, Fragments gives you the tools to do it—fast, open, and free.

> For more information and tutorials, check out our [documentation](https://docs.thatopen.com/intro).


[npm]: https://img.shields.io/npm/v/@thatopen/fragments
[npm-url]: https://www.npmjs.com/package/@thatopen/fragments
[npm-downloads]: https://img.shields.io/npm/dw/@thatopen/fragments
