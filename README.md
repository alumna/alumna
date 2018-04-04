# Altiva Framework: Development for Humans

[![Join the chat at https://gitter.im/Altiva/altiva](https://badges.gitter.im/Altiva/altiva.svg)](https://gitter.im/Altiva/altiva?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Build Status](https://travis-ci.org/Altiva/altiva.svg?branch=2.0)](https://travis-ci.org/Altiva/altiva)

Altiva is a **front-end framework** and its goal is to make universal app development as **human-friendly** as possible. Nevertheless, besides the easiness, we also consider high performance and safety.


# ![altiva](media/altiva.png)

Altiva is open-source (MIT), written in Javascript and based on [Svelte](https://svelte.technology/).

## Features

 - Easy built-in routing
 - Easy component creation (HTML and CSS)
 - Easy mobile packaging (Android, iOS, Windows Phone, etc)
 - Component auto-loading and auto-caching
 - Ajax caching *(in development)*
 - Easy route filters *(in development)*
 - Support for APIs and backends with JWT authentication

## Install

### Step 1

[Install Node.js](https://nodejs.org/en/download/) and then install Altiva 2.0 globally:

```shell
npm install @altiva/altiva -g
```

### Step 2

 1. Navigate in your terminal to a directory where you organize your projects
 2. Create a new Altiva project. A new folder "project_name" will be created with the base structure of files and folders.

```shell
altiva new <project_name>
```

 3. Or, create a new Altiva project using an existing empty directory. The base structure of files and folders will be created inside of it.

```shell
altiva new .
```

### Step 3

Start the development mode with:

```shell
altiva dev
```

The pre-compiled files of your project will be saved in `dev` folder and will run in your browser, refreshing with each modification.

### Step 4

When you are done, end the dev-mode with a `CTRL+C` and build your project with:

```shell
altiva build
```

It will be compiled and saved in `build` folder, with additional minification and tree-shaking process.

## License

Copyright (c) 2015-2018 Paulo Coghi and contributors. Released under an [MIT license](LICENSE.md).
