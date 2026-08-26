const RESERVED = new Set([ 'layout', 'middleware', 'redirect', 'data' ]);

export function split_paths (value) {
	return String(value)
		.split(',')
		.map(s => s.trim())
		.filter(Boolean);
}

function is_plain_object (value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function add_error (errors, message) {
	errors.push(message);
}

// Copy group routes onto app.route. Named groups (group:x) have no path prefix.
export function expand_groups (app, errors) {
	if (!is_plain_object(app.group))
		return;

	for (const key of Object.keys(app.group)) {
		if (!key.length) {
			add_error(errors, 'Route groups must be defined with a base path or with names like "group:name".');
			continue;
		}

		if (key === 'group:') {
			add_error(errors, 'Incomplete group name "group:"');
			continue;
		}

		const content = app.group[key];

		if (!is_plain_object(content)) {
			add_error(errors, 'The route group "' + key + '" isn\'t in a valid format.');
			continue;
		}

		let base = '';
		if (!key.startsWith('group:'))
			base = key.endsWith('/') ? key.slice(0, -1) : key;

		for (const original of Object.keys(content)) {
			if (!is_plain_object(content[original])) {
				add_error(errors, 'The route group "' + key + '" isn\'t in a valid format.');
				continue;
			}

			const pieces = split_paths(original);
			if (!pieces.length) {
				add_error(errors, 'Invalid route path "' + original + '" from group "' + key + '"');
				continue;
			}

			for (const piece of pieces) {
				const path = base
					? base + (piece.startsWith('/') ? '' : '/') + piece
					: piece;

				if (app.route[path]) {
					add_error(errors, 'The path "' + path + '" from group "' + key + '" is defined multiple times');
					continue;
				}

				app.route[path] = content[original];
			}
		}
	}
}

function area_map_of (value) {
	if (Array.isArray(value))
		return { map: null, error: 'Use middleware: [\'name\'] instead of the array form [ areaMap, \'name\' ].' };

	if (!is_plain_object(value))
		return { map: null, error: 'Route values must be objects.' };

	const map = {};
	for (const key of Object.keys(value)) {
		if (RESERVED.has(key))
			continue;
		map[key] = value[key];
	}
	return { map, redirect: value.redirect, layout: value.layout, middleware: value.middleware };
}

function is_ident (name) {
	return typeof name === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

export function read_layouts (app, errors, components) {
	const layouts = {};
	if (app.layout == null)
		return layouts;

	if (!is_plain_object(app.layout)) {
		add_error(errors, 'app.layout must be an object');
		return layouts;
	}

	for (const name of Object.keys(app.layout)) {
		const def = app.layout[name];
		if (!is_plain_object(def)) {
			add_error(errors, 'app.layout.' + name + ' must be an object with component and areas');
			continue;
		}
		if (typeof def.component !== 'string' || !def.component.length) {
			add_error(errors, 'app.layout.' + name + ' needs a component name string');
			continue;
		}
		if (!Array.isArray(def.areas) || !def.areas.length) {
			add_error(errors, 'app.layout.' + name + ' needs an areas array');
			continue;
		}

		let ok = true;
		for (const area of def.areas) {
			if (!is_ident(area)) {
				add_error(errors, 'app.layout.' + name + ' area "' + area + '" must be a valid identifier');
				ok = false;
				break;
			}
			if (Array.isArray(app.areas) && !app.areas.includes(area)) {
				add_error(errors, 'app.layout.' + name + ' uses area "' + area + '" that was not defined in app.areas');
				ok = false;
			}
		}
		if (!ok)
			continue;

		components.add(def.component);
		layouts[name] = { component: def.component, areas: def.areas };
	}

	return layouts;
}

function read_middleware_names (value, errors, label) {
	if (value == null)
		return [];
	if (!Array.isArray(value)) {
		add_error(errors, label + ' must be an array of names');
		return [];
	}
	const names = [];
	for (const name of value) {
		if (typeof name !== 'string' || !name.length)
			add_error(errors, label + ' names must be non-empty strings');
		else
			names.push(name);
	}
	return names;
}

export function validate_app (app) {
	const errors = [];

	if (app.areas === undefined)
		errors.push('No areas defined in app.areas[]');
	else if (!Array.isArray(app.areas))
		errors.push('app.areas must be an array');
	else if (!app.areas.length)
		errors.push('You need to define an array to "app.areas" with one or more strings as the areas\' names.');
	else {
		for (const area of app.areas) {
			if (typeof area !== 'string' || !area.length) {
				errors.push('The area ' + area + ' is not a string, and only strings can be used as names of areas.');
				break;
			}
			if (RESERVED.has(area))
				errors.push('"' + area + '" is reserved and cannot be used as an area name.');
		}
	}

	expand_groups(app, errors);

	const components = new Set();
	const layouts = read_layouts(app, errors, components);
	const middleware = read_middleware_names(app.middleware, errors, 'app.middleware');

	if (!is_plain_object(app.route) || !Object.keys(app.route).length) {
		if (!errors.length)
			errors.push('You need at least one route defined in your app.');
		return { errors, routes: {}, components: [ ...components ], layouts, middleware };
	}

	const routes = {};
	const seen = new Map();

	for (const raw_path of Object.keys(app.route)) {
		if (!raw_path.length) {
			errors.push('Route paths must be non-empty strings.');
			continue;
		}

		const paths = split_paths(raw_path);
		if (!paths.length) {
			errors.push('Invalid route path: "' + raw_path + '"');
			continue;
		}

		const parsed = area_map_of(app.route[raw_path]);
		if (parsed.error) {
			errors.push('In the route \'' + raw_path + '\': ' + parsed.error);
			continue;
		}

		if (parsed.redirect && typeof parsed.redirect !== 'string')
			errors.push('In the route \'' + raw_path + '\' redirect must be a string.');

		if (!parsed.redirect && !Object.keys(parsed.map).length)
			errors.push('In the route \'' + raw_path + '\' you need to define at least one area to use.');

		for (const area of Object.keys(parsed.map)) {
			if (Array.isArray(app.areas) && !app.areas.includes(area))
				errors.push('In the route \'' + raw_path + '\' you are refering to the area \'' + area + '\' that was not defined in app.areas array.');

			const component = parsed.map[area];
			if (typeof component !== 'string' || !component.length)
				errors.push('In the route \'' + raw_path + '\' the area \'' + area + '\' must be a component name string.');
			else
				components.add(component);
		}

		if (parsed.layout != null) {
			if (typeof parsed.layout !== 'string' || !parsed.layout.length)
				errors.push('In the route \'' + raw_path + '\' layout must be a layout name string');
			else if (!layouts[parsed.layout])
				errors.push('In the route \'' + raw_path + '\' layout "' + parsed.layout + '" is not defined in app.layout');
		}

		const route_mw = read_middleware_names(
			parsed.middleware,
			errors,
			'In the route \'' + raw_path + '\' middleware'
		);

		for (const path of paths) {
			if (seen.has(path))
				errors.push('The path "' + path + '" is defined multiple times');
			else
				seen.set(path, raw_path);

			routes[path] = {
				path,
				areas: parsed.map,
				redirect: parsed.redirect || null,
				layout: parsed.layout || null,
				middleware: route_mw
			};
		}
	}

	return { errors, routes, components: [ ...components ], layouts, middleware };
}
