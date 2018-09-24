# Install and Quick Start

## Step 1 - Install Altiva

[Install Node.js](https://nodejs.org/en/download/) and then install Altiva 2.0 globally:

```shell
npm install @altiva/altiva -g
```

## Step 2 - Create a project

 1. Navigate in your terminal to a directory where you organize your projects
 2. Create a new Altiva project. A new folder "project_name" will be created with the base structure of files and folders.

```shell
altiva new <project_name>
```

 3. Or, create a new Altiva project using an existing empty directory. The base structure of files and folders will be created inside of it.

```shell
altiva new .
```

## Step 3 - Start the Dev mode

Start the development mode with:

```shell
altiva dev
```

The pre-compiled files of your project will be saved in `dev` folder and will run in your browser, refreshing with each modification.

## Step 4 - Build your project

When you are done, end the dev-mode with a `CTRL+C` and build your project with:

```shell
altiva build
```

It will be compiled and saved in `build` folder, with additional minification and tree-shaking process.