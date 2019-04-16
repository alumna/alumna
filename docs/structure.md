# Structure of your app

When you create an Alumna project, after running `alumna dev` and `alumna build` mode, this is the folder structure you will find:

```
├ alumna.hjson
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
│ └ # development mode files (auto generated with "alumna dev")
└ build
  └ # build files (auto generated with "alumna build")
```

To get a practical learning, we will show you [how to create and manage routes](routes.md) and how to choose which components must be loaded on each of them.