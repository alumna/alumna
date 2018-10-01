# Structure of your app

When you create an Altiva project, after running `altiva dev` and `altiva build` mode, this is the folder structure you will find:

```
├ altiva.hjson
├ src
│ ├ components
│ │ ├ # component files
│ ├ app.js # routes
│ └ index.html
├ middlewares
│ └ # middleware files
├ modules
│ └ # module files
├ dev
│ └ # development mode files (auto generated with "altiva dev")
└ build
  └ # build files (auto generated with "altiva build")
```

To get a practical learning, we will show you [how to create and manage routes](routes/routes.md) and how to choose which components must be loaded on each of them.