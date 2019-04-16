import { EOL } 		from 'os';
import fs 			from 'fs-extra';

import MainCode 	from './../../src/generators/app/maincode';


/* Default app file name for the test */
const appFileName = 'app.js';

test('Case 1 - Single area and single component', () => {

	expect.assertions( 6 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case1.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().then( () => {

				expect( app.errors ).toEqual( [] );

				expect( app.areas ).toEqual( [ 'content' ] );

				expect( app.routes ).toEqual( { '/': { content: 'HelloAlumna' } } );

				expect( app.html ).toBe( EOL + '<!-- Area: "content" -->' + EOL
											 + '{#if _route == \'/\' }' + EOL
											 + '\t<HelloAlumna/>' + EOL
											 + '{/if}' + EOL + '' );

				expect( app.script ).toBe( '<script>export default {components: {HelloAlumna: Alumna.component[ \'HelloAlumna\' ],},methods: {route: Alumna.route,redirect: Alumna.redirect}}</script>' );

				expect( app.route_functions ).toBe( 'Alumna.routes[ \'/\' ] = function () { return Promise.all( [ Alumna.load( \'HelloAlumna\' ) ] ); };' + EOL + EOL );

				resolve( true );

			});

		});

	});

});

test('Case 1 (part2) - Single area and single component BUT with dependencies', () => {

	expect.assertions( 6 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case1.js', 'utf8', ( err, code ) => {

			const componentsMap = {
				
				HelloAlumna: {
					Sub: true
				},

				Sub: {
					Sub2: true
				},
			}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().then( () => {

				expect( app.errors ).toEqual( [] );

				expect( app.areas ).toEqual( [ 'content' ] );

				expect( app.routes ).toEqual( { '/': { content: 'HelloAlumna' } } );

				expect( app.html ).toBe( EOL + '<!-- Area: "content" -->' + EOL
											 + '{#if _route == \'/\' }' + EOL
											 + '\t<HelloAlumna/>' + EOL
											 + '{/if}' + EOL + '' );

				expect( app.script ).toBe( '<script>export default {components: {HelloAlumna: Alumna.component[ \'HelloAlumna\' ],},methods: {route: Alumna.route,redirect: Alumna.redirect}}</script>' );

				expect( app.route_functions ).toBe( 'Alumna.routes[ \'/\' ] = function () { return Promise.all( [ Alumna.load( \'HelloAlumna\' ), Alumna.load( \'Sub\' ), Alumna.load( \'Sub2\' ) ] ); };' + EOL + EOL );

				resolve( true );

			});

		});

	});

});

test('Sintatic errors - Cases 2 and 3 - Wrong codes in app.js', () => {

	expect.assertions( 2 );

	const promise1 = new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case2.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Unexpected end of input in src/app.js, line: 1" } );

				resolve( true )

			});

		});

	});

	const promise2 = new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case3.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Unexpected token } in src/app.js, line: 6" } );

				resolve( true )

			});

		});

	});

	return Promise.all( [ promise1, promise2 ] );

});

test('Semantic errors - Cases 4-8, 10-11, 13-16 - Wrong codes in app.js', () => {

	expect.assertions( 11 );

	const promise1 = new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case4.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": The area [object Object] is not a string, and only strings can be used as names of areas." } );

				resolve( true )

			});

		});

	});

	const promise2 = new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case5.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": 'Error in src/' + appFileName + ': You need to define an array to "app.areas" with one or more strings as the areas\' names.' } );

				resolve( true )

			});

		});

	});

	const promise3 = new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case6.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": 'Error in src/' + appFileName + ': In the route \'/\' you are refering to the area \'content2\' that was not defined in app.areas array.' } );

				resolve( true )

			});

		});

	});

	const promise4 = new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case7.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": 'Warning in src/' + appFileName + ': Before defining routes you need to define areas in app.areas variable.' } );

				resolve( true )

			});

		});

	});

	// Multiple errors, to cover 100% the logical possibilities in line 300
	const promise5 = new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case8.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( {
					
					"message": 'Error in src/' + appFileName + ': In the route \'/\' you are refering to the area \'content3\' that was not defined in app.areas array.' + EOL
							 + 'Error in src/' + appFileName + ': In the route \'/\' you are refering to the area \'content4\' that was not defined in app.areas array.'
				} );

				resolve( true )

			});

		});

	});

	// Route with an empty object (no areas defined in a route)
	const promise6 = new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case10.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": 'Error in src/' + appFileName + ': In the route \'/\' you need to define at least one area to use.' } );

				resolve( true )

			});

		});

	});

	// app.js without app.route defined
	const promise7 = new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case11.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": 'Error in src/' + appFileName + ': You need at least one route defined in your app. Check documentation for more details.' } );

				resolve( true )

			});

		});

	});

	// Empty toute path
	const promise8 = new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case13.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": 'Error in src/' + appFileName + ': Route paths must be non-empty strings.' } );

				resolve( true )

			});

		});

	});

	// Empty multiple paths
	const promise9 = new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case14.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": 'Error in src/' + appFileName + ': Invalid route path: ",,"' } );

				resolve( true )

			});

		});

	});

	// Single repeated route
	const promise10 = new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case15.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": The following routes are defined multiple times: \"/test\"" } );

				resolve( true )

			});

		});

	});

	// Various repeated routes
	const promise11 = new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case16.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": The following routes are defined multiple times: \"/test\" and \"/\"" } );

				resolve( true )

			});

		});

	});

	return Promise.all( [ promise1, promise2, promise3, promise4, promise5, promise6, promise7, promise8, promise9, promise10, promise11 ] );

});

test('Case 9 - Multiple areas and multiple components', () => {

	expect.assertions( 6 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case9.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().then( () => {

				expect( app.errors ).toEqual( [] );

				expect( app.areas ).toEqual( [ 'content', 'footer' ] );

				expect( app.routes ).toEqual( {
					
					'/': {
						content: 'HelloAlumna',
						footer: 'Footer1'
					},

					'/other': {
						content: 'HelloAlumna',
						footer: 'Footer2'
					}

				} );

				expect( app.html ).toBe( EOL + '<!-- Area: "content" -->' + EOL
											 + '{#if _route == \'/\' || _route == \'/other\' }' + EOL
											 + '\t<HelloAlumna/>' + EOL
											 + '{/if}' + EOL


									   + EOL + '<!-- Area: "footer" -->' + EOL
    										 + '{#if _route == \'/\' }' + EOL
    										 + '\t<Footer1/>' + EOL
    										 + '{:elseif _route == \'/other\' }' + EOL
    										 + '\t<Footer2/>' + EOL
    										 + '{/if}' + EOL
    										 
    										 + '' );

				expect( app.script ).toBe( '<script>export default {components: {HelloAlumna: Alumna.component[ \'HelloAlumna\' ],Footer1: Alumna.component[ \'Footer1\' ],Footer2: Alumna.component[ \'Footer2\' ],},methods: {route: Alumna.route,redirect: Alumna.redirect}}</script>' );

				expect( app.route_functions ).toBe(

					'Alumna.routes[ \'/\' ] = function () { return Promise.all( [ Alumna.load( \'HelloAlumna\' ), Alumna.load( \'Footer1\' ) ] ); };' + EOL + EOL

				  + 'Alumna.routes[ \'/other\' ] = function () { return Promise.all( [ Alumna.load( \'HelloAlumna\' ), Alumna.load( \'Footer2\' ) ] ); };' + EOL + EOL

				);

				resolve( true );

			});

		});

	});

});

test('Case 12 - Single area, single component and route with multiple paths', () => {

	expect.assertions( 6 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case12.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().then( () => {

				expect( app.errors ).toEqual( [] );

				expect( app.areas ).toEqual( [ 'content' ] );

				expect( app.routes ).toEqual( {

					'/':      { content: 'HelloAlumna' },
					'/test': { content: 'HelloAlumna' }

				} );

				expect( app.html ).toBe( EOL + '<!-- Area: "content" -->' + EOL
											 + '{#if _route == \'/\' || _route == \'/test\' }' + EOL
											 + '\t<HelloAlumna/>' + EOL
											 + '{/if}' + EOL + '' );

				expect( app.script ).toBe( '<script>export default {components: {HelloAlumna: Alumna.component[ \'HelloAlumna\' ],},methods: {route: Alumna.route,redirect: Alumna.redirect}}</script>' );

				expect( app.route_functions ).toBe( 'Alumna.routes[ \'/\' ] = function () { return Promise.all( [ Alumna.load( \'HelloAlumna\' ) ] ); };' + EOL + EOL + 'Alumna.routes[ \'/test\' ] = Alumna.routes[ \'/\' ];' + EOL + EOL );

				resolve( true );

			});

		});

	});

});

test('Case 17 - Wrong route group', () => {

	expect.assertions( 1 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case17.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": The route group \"group:public\" isn't in a valid format." } );

				resolve( true )

			});

		});

	});

});

test('Case 18 - Grouped route without base path', () => {

	expect.assertions( 6 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case18.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().then( () => {

				expect( app.errors ).toEqual( [] );

				expect( app.areas ).toEqual( [ 'content' ] );

				expect( app.routes ).toEqual( { '/': { content: 'HelloAlumna' } } );

				expect( app.html ).toBe( EOL + '<!-- Area: "content" -->' + EOL
											 + '{#if _route == \'/\' }' + EOL
											 + '\t<HelloAlumna/>' + EOL
											 + '{/if}' + EOL + '' );

				expect( app.script ).toBe( '<script>export default {components: {HelloAlumna: Alumna.component[ \'HelloAlumna\' ],},methods: {route: Alumna.route,redirect: Alumna.redirect}}</script>' );

				expect( app.route_functions ).toBe( 'Alumna.routes[ \'/\' ] = function () { return Promise.all( [ Alumna.load( \'HelloAlumna\' ) ] ); };' + EOL + EOL );

				resolve( true );

			});

		});

	});

});

test('Case 19 - Grouped route with base path', () => {

	expect.assertions( 6 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case19.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().then( () => {

				expect( app.errors ).toEqual( [] );

				expect( app.areas ).toEqual( [ 'content' ] );

				expect( app.routes ).toEqual( { '/base/route': { content: 'HelloAlumna' } } );

				expect( app.html ).toBe( EOL + '<!-- Area: "content" -->' + EOL
											 + '{#if _route == \'/base/route\' }' + EOL
											 + '\t<HelloAlumna/>' + EOL
											 + '{/if}' + EOL + '' );

				expect( app.script ).toBe( '<script>export default {components: {HelloAlumna: Alumna.component[ \'HelloAlumna\' ],},methods: {route: Alumna.route,redirect: Alumna.redirect}}</script>' );

				expect( app.route_functions ).toBe( 'Alumna.routes[ \'/base/route\' ] = function () { return Promise.all( [ Alumna.load( \'HelloAlumna\' ) ] ); };' + EOL + EOL );

				resolve( true );

			});

		});

	});

});

test('Case 20 - Conflicting routes from groups and normal routes', () => {

	expect.assertions( 1 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case20.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": The path \"/base/route\" from group \"/base\" is defined multiple times" } );

				resolve( true )

			});

		});

	});

});

test('Case 21 - Empty string for route inside group', () => {

	expect.assertions( 1 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case21.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": Path with empty string inside group \"/base\"" } );

				resolve( true )

			});

		});

	});

});

test('Case 22 - Invalid "multiple" route inside group', () => {

	expect.assertions( 1 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case22.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": Invalid route path \",,,\" from group \"/base\"" } );

				resolve( true )

			});

		});

	});

});

test('Case 23 - Incomplete group name "group:"', () => {

	expect.assertions( 1 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case23.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": Incomplete group name \"group:\"" } );

				resolve( true )

			});

		});

	});

});

test('Case 24 - Routes inside group with multiple paths', () => {

	expect.assertions( 6 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case24.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().then( () => {

				expect( app.errors ).toEqual( [] );

				expect( app.areas ).toEqual( [ 'content' ] );

				expect( app.routes ).toEqual( { '/base/path1': { content: 'ReusedComponent' }, '/base/path2': { content: 'ReusedComponent' } } );

				expect( app.html ).toBe( EOL + '<!-- Area: "content" -->' + EOL
											 + '{#if _route == \'/base/path1\' || _route == \'/base/path2\' }' + EOL
											 + '\t<ReusedComponent/>' + EOL
											 + '{/if}' + EOL + '' );

				expect( app.script ).toBe( '<script>export default {components: {ReusedComponent: Alumna.component[ \'ReusedComponent\' ],},methods: {route: Alumna.route,redirect: Alumna.redirect}}</script>' );

				expect( app.route_functions ).toBe( 'Alumna.routes[ \'/base/path1\' ] = function () { return Promise.all( [ Alumna.load( \'ReusedComponent\' ) ] ); };' + EOL + EOL + 'Alumna.routes[ \'/base/path2\' ] = Alumna.routes[ \'/base/path1\' ];' + EOL + EOL );

				resolve( true );

			});

		});

	});

});

test('Case 25 - Empty group name', () => {

	expect.assertions( 1 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case25.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": Route groups must be defined with a base path or with names like \"group:name\"." } );

				resolve( true )

			});

		});

	});

});

test('Case 26 - Corrected (multiple) paths in groups', () => {

	expect.assertions( 6 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case26.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().then( () => {

				expect( app.errors ).toEqual( [] );

				expect( app.areas ).toEqual( [ 'content' ] );

				expect( app.routes ).toEqual( { '/base/path1': { content: 'ReusedComponent' }, '/base/path2': { content: 'ReusedComponent' } } );

				expect( app.html ).toBe( EOL + '<!-- Area: "content" -->' + EOL
											 + '{#if _route == \'/base/path1\' || _route == \'/base/path2\' }' + EOL
											 + '\t<ReusedComponent/>' + EOL
											 + '{/if}' + EOL + '' );

				expect( app.script ).toBe( '<script>export default {components: {ReusedComponent: Alumna.component[ \'ReusedComponent\' ],},methods: {route: Alumna.route,redirect: Alumna.redirect}}</script>' );

				expect( app.route_functions ).toBe( 'Alumna.routes[ \'/base/path1\' ] = function () { return Promise.all( [ Alumna.load( \'ReusedComponent\' ) ] ); };' + EOL + EOL + 'Alumna.routes[ \'/base/path2\' ] = Alumna.routes[ \'/base/path1\' ];' + EOL + EOL );

				resolve( true );

			});

		});

	});

});

test('Case 27 - Corrected (single) paths in groups', () => {

	expect.assertions( 6 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case27.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().then( () => {

				expect( app.errors ).toEqual( [] );

				expect( app.areas ).toEqual( [ 'content' ] );

				expect( app.routes ).toEqual( { '/base/route': { content: 'HelloAlumna' } } );

				expect( app.html ).toBe( EOL + '<!-- Area: "content" -->' + EOL
											 + '{#if _route == \'/base/route\' }' + EOL
											 + '\t<HelloAlumna/>' + EOL
											 + '{/if}' + EOL + '' );

				expect( app.script ).toBe( '<script>export default {components: {HelloAlumna: Alumna.component[ \'HelloAlumna\' ],},methods: {route: Alumna.route,redirect: Alumna.redirect}}</script>' );

				expect( app.route_functions ).toBe( 'Alumna.routes[ \'/base/route\' ] = function () { return Promise.all( [ Alumna.load( \'HelloAlumna\' ) ] ); };' + EOL + EOL );

				resolve( true );

			});

		});

	});

});

test('Case 28 - Multiple errors inside group to cover 100% of the possibilities', () => {

	expect.assertions( 1 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case28.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": Path with empty string inside group \"/base\"" } );

				resolve( true )

			});

		});

	});

});

test('Case 29 - One middleware', () => {

	expect.assertions( 5 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case29-used-middlewares.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().then( () => {

				expect( app.errors ).toEqual( [] );

				expect( app.areas ).toEqual( [ 'content' ] );

				expect( app.routes ).toEqual( {
					
					'/': {
						content: 'HelloAlumna'
					},

					'/:number': {
						content: 'HelloAlumna'
					}

				} );

				expect( app.middlewares ).toEqual( {
					
					'/:number': [ 'first' ]

				} );

				expect( app.used_middlewares ).toEqual( { first: true } );

				resolve( true );

			});

		});

	});

});

test('Case 30 - Multiple middleware', () => {

	expect.assertions( 5 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case30-multiple-middlewares.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().then( () => {

				expect( app.errors ).toEqual( [] );

				expect( app.areas ).toEqual( [ 'content' ] );

				expect( app.routes ).toEqual( {
					
					'/:number': {
						content: 'HelloAlumna'
					}

				} );

				expect( app.middlewares ).toEqual( {
					
					'/:number': [ 'first', 'second' ]

				} );

				expect( app.used_middlewares ).toEqual( { first: true, second: true } );

				resolve( true );

			});

		});

	});

});

test('Case 31 - Invalid middleware', () => {

	expect.assertions( 1 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case31-invalid-middlewares.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": Invalid middlewares defined on route '/:number'." } );

				resolve( true )

			});

		});

	});

});

test('Case 32 - One middleware', () => {

	expect.assertions( 5 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case32-multiple-middlewares-and-routes.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().then( () => {

				expect( app.errors ).toEqual( [] );

				expect( app.areas ).toEqual( [ 'content' ] );

				expect( app.routes ).toEqual( {
					
					'/': {
						content: 'HelloAlumna'
					},

					'/:number': {
						content: 'HelloAlumna'
					}

				} );

				expect( app.middlewares ).toEqual( {
					
					'/': [ 'first', 'second' ],

					'/:number': [ 'first', 'second' ]

				} );

				expect( app.used_middlewares ).toEqual( { first: true, second: true } );

				resolve( true );

			});

		});

	});

});

test('Case 33 - Invalid middlewares in multiple routes', () => {

	expect.assertions( 1 );

	return new Promise( ( resolve, reject ) => {

		fs.readFile( __dirname + '/maincode/case33-invalid-middlewares-in-multiple-routes.js', 'utf8', ( err, code ) => {

			const componentsMap = {}

			const app = new MainCode( code, componentsMap, appFileName );

			app.compile().catch( ( error ) => {

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": Invalid middlewares defined on route '/'." } );

				resolve( true )

			});

		});

	});

});