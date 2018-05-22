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

				expect( app.routes ).toEqual( { '/': { content: 'HelloAltiva' } } );

				expect( app.html ).toBe( EOL + '<!-- Area: "content" -->' + EOL
											 + '{#if _route == \'/\' }' + EOL
											 + '\t<HelloAltiva/>' + EOL
											 + '{/if}' + EOL + '' );

				expect( app.script ).toBe( '<script>export default {components: {HelloAltiva: Altiva.component[ \'HelloAltiva\' ],}}</script>' );

				expect( app.route_functions ).toBe( 'Altiva.routes[ \'/\' ] = Promise.all( [ Altiva.load( \'HelloAltiva\' ) ] );' + EOL + EOL );

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
				
				HelloAltiva: {
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

				expect( app.routes ).toEqual( { '/': { content: 'HelloAltiva' } } );

				expect( app.html ).toBe( EOL + '<!-- Area: "content" -->' + EOL
											 + '{#if _route == \'/\' }' + EOL
											 + '\t<HelloAltiva/>' + EOL
											 + '{/if}' + EOL + '' );

				expect( app.script ).toBe( '<script>export default {components: {HelloAltiva: Altiva.component[ \'HelloAltiva\' ],}}</script>' );

				expect( app.route_functions ).toBe( 'Altiva.routes[ \'/\' ] = Promise.all( [ Altiva.load( \'HelloAltiva\' ), Altiva.load( \'Sub\' ), Altiva.load( \'Sub2\' ) ] );' + EOL + EOL );

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

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": The route \"/test\" is defined multiple times." } );

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

				expect( error ).toEqual( { "message": "Error in src/" + appFileName + ": The routes \"/test\" and \"/\" are defined multiple times." } );

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
						content: 'HelloAltiva',
						footer: 'Footer1'
					},

					'/other': {
						content: 'HelloAltiva',
						footer: 'Footer2'
					}

				} );

				expect( app.html ).toBe( EOL + '<!-- Area: "content" -->' + EOL
											 + '{#if _route == \'/\' || _route == \'/other\' }' + EOL
											 + '\t<HelloAltiva/>' + EOL
											 + '{/if}' + EOL


									   + EOL + '<!-- Area: "footer" -->' + EOL
    										 + '{#if _route == \'/\' }' + EOL
    										 + '\t<Footer1/>' + EOL
    										 + '{:elseif _route == \'/other\' }' + EOL
    										 + '\t<Footer2/>' + EOL
    										 + '{/if}' + EOL
    										 
    										 + '' );

				expect( app.script ).toBe( '<script>export default {components: {HelloAltiva: Altiva.component[ \'HelloAltiva\' ],Footer1: Altiva.component[ \'Footer1\' ],Footer2: Altiva.component[ \'Footer2\' ],}}</script>' );

				expect( app.route_functions ).toBe(

					'Altiva.routes[ \'/\' ] = Promise.all( [ Altiva.load( \'HelloAltiva\' ), Altiva.load( \'Footer1\' ) ] );' + EOL + EOL

				  + 'Altiva.routes[ \'/other\' ] = Promise.all( [ Altiva.load( \'HelloAltiva\' ), Altiva.load( \'Footer2\' ) ] );' + EOL + EOL

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

					'/':      { content: 'HelloAltiva' },
					'/test': { content: 'HelloAltiva' }

				} );

				expect( app.html ).toBe( EOL + '<!-- Area: "content" -->' + EOL
											 + '{#if _route == \'/\' || _route == \'/test\' }' + EOL
											 + '\t<HelloAltiva/>' + EOL
											 + '{/if}' + EOL + '' );

				expect( app.script ).toBe( '<script>export default {components: {HelloAltiva: Altiva.component[ \'HelloAltiva\' ],}}</script>' );

				expect( app.route_functions ).toBe( 'Altiva.routes[ \'/\' ] = Promise.all( [ Altiva.load( \'HelloAltiva\' ) ] );' + EOL + EOL + 'Altiva.routes[ \'/test\' ] = Altiva.routes[ \'/\' ];' + EOL + EOL );

				resolve( true );

			});

		});

	});

});