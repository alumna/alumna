# Altiva Framework: Development for Humans

(Alpha version. Do not use it in production)

Altiva is a **front-end framework** and its goal is to make universal app development as **human-friendly** as possible. Nevertheless, besides the easiness, we also consider high performance and safety.


# ![altiva](media/altiva.png)

Altiva is open-source (MIT), written in Javascript and based on [Ractive.js](http://www.ractivejs.org/).

## Features

 - Easy built-in routing
 - Easy component creation (HTML and CSS)
 - Easy mobile packaging (Android, iOS, Windows Phone, etc)
 - Component auto-loading and auto-caching
 - Ajax caching *(in development)*
 - Easy route filters *(in development)*
 - Support for APIs and backends with JWT authentication

## Install and Quick Start

### Step 1

[Download](https://raw.githubusercontent.com/Altiva/altiva/develop/altiva.min.js) and include Altiva in your html project:

```html
<!DOCTYPE html>
<html>
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Your Incredible App</title>
	</head>
	<body>
	  <script src='js/altiva.min.js'></script>
	</body>
</html>
```

### Step 2

 1. Define a space in our page (a session) that we will name as 'content' (you are free to name your sessions)
 2. Define an initial route **'/'** and tell Altiva to load `HelloWorld` component into this route, in the content session

```html
...
	<body>
	  <script src='js/altiva.min.js'></script>
	  <script>
			
		var app = new Altiva ()

		app.sessions( [ 'content' ] )

		app.route( '/',
		{
			content: 'HelloWorld'
		});

		app.start();

		</script>
	</body>
...
```

### Step 3

Create a folder `components` in the root of your project and create the file `HelloWorld.html`:

```html
<p>Hello World!</p>
```

Then open your **`index.html`** in your browser!

## Browser support

Tested successfully in IE8+ and all modern browsers.

## Mobile support

Tested successfully in Android 2.3+. In progress with iOS and Windows Phone. Please test it and tell us your results in an issue!

## License

Copyright (c) 2015-16 Paulo Coghi and contributors. Released under an [MIT license](LICENSE.md).
