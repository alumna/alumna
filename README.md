# Alumna Framework: Development for Humans

![npm](https://img.shields.io/npm/v/@alumna/alumna.svg) [![Build Status](https://travis-ci.org/alumna/alumna.svg?branch=2.0)](https://travis-ci.org/alumna/alumna) [![codecov](https://codecov.io/gh/alumna/alumna/branch/2.0/graph/badge.svg)](https://codecov.io/gh/alumna/alumna) ![npm](https://img.shields.io/npm/dt/@alumna/alumna.svg) [![Join the community!](https://withspectrum.github.io/badge/badge.svg)](https://spectrum.chat/alumna)

Alumna is a **front-end framework** and its goal is to make universal app development as **human-friendly** as possible. Nevertheless, besides the easiness, we also consider high performance and safety.


# ![alumna](other/media/alumna.png)

Alumna is open-source (MIT), written in Javascript and based on [Svelte](https://svelte.technology/).

## Features

 - Easy built-in routing
 - Easy component creation (HTML and CSS)
 - Easy mobile packaging (Android, iOS, Windows Phone, etc)
 - Component auto-loading and auto-caching
 - Easy consumption of HTTP API's
 - Easy JWT authentication
 - Real-time integration with socket back-ends *(in development)*
 - Easy route filters
 - Support for APIs and backends with JWT authentication

## Install

### Step 1

[Install Node.js](https://nodejs.org/en/download/) and then install Alumna 2.0 globally:

```shell
npm install @alumna/alumna -g
```

### Step 2

 1. Navigate in your terminal to a directory where you organize your projects
 2. Create a new Alumna project. A new folder "project_name" will be created with the base structure of files and folders.

```shell
alumna new <project_name>
```

 3. Or, create a new Alumna project using an existing empty directory. The base structure of files and folders will be created inside of it.

```shell
alumna new .
```

### Step 3

Start the development mode with:

```shell
alumna dev
```

The pre-compiled files of your project will be saved in `dev` folder and will run in your browser, refreshing with each modification.

### Step 4

When you are done, end the dev-mode with a `CTRL+C` and build your project with:

```shell
alumna build
```

It will be compiled and saved in `build` folder, with additional minification and tree-shaking process.

## License

Copyright (c) 2015-2018 Paulo Coghi and contributors. Released under an [MIT license](LICENSE.md).
