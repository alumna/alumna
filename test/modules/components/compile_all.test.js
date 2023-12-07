import { compile_all } from './../../../src/modules/components/compile_all.js';



describe( 'Mapping components from a ficticious (valid) app object', () => {

	test('1. Normal app areas and routes / no groups', async () => {

		/* Preparing the contract to properly test the function */

		const state = {
			app: {
				areas: [ 'header', 'content', 'footer' ],
				group: {},
				route: {
					'/':      { 'content': 'HelloAlumna' }
				}
			},
			errors: {},
			server: { memory: () => {} },
			config: { dir: './test/modules/components/compile_all/' }
		};

		const next  = () => {};
		const end   = () => {};
		
		await compile_all( state, next, end )

		// expect( state.components ).toEqual({ 'HelloAlumna': {
		// 	code: null,
		// 	subcomponents: {}
		// } });

		expect( state.components_per_route ).toEqual({
			'/':      { 'HelloAlumna': true }
		});

	});

	test('2. Reusing the same component in different routes', async () => {

		/* Preparing the contract to properly test the function */

		const state = {
			app: {
				areas: [ 'header', 'content', 'footer' ],
				group: {},
				route: {
					'/':      { 'content': 'HelloAlumna' },
					'/hello': { 'content': 'HelloAlumna' }
				}
			},
			errors: {},
			server: { memory: () => {} },
			config: { dir: './test/modules/components/compile_all/' }
		};

		const next  = () => {};
		const end   = () => {};
		
		await compile_all( state, next, end )

		// expect( state.components ).toEqual({ 'HelloAlumna': {
		// 	code: null,
		// 	subcomponents: {}
		// } });

		expect( state.components_per_route ).toEqual({
			'/':      { 'HelloAlumna': true },
			'/hello': { 'HelloAlumna': true }
		});

	});

	test('3. End compile flow if there are errors', async () => {

		/* Preparing the contract to properly test the function */

		const state = {
			app: {
				areas: [ 'header', 'content', 'footer' ],
				group: {},
				route: {
					'/':      { 'content': 'HelloAlumna' }
				}
			},
			errors: {
				'Example error title': 'Example error message'
			},
			server: { memory: () => {} },
			config: { dir: './test/modules/components/compile_all/' }
		};

		const next  = () => {};
		const end   = () => {};
		
		await compile_all( state, next, end )

		// expect( state.components ).toEqual({ 'HelloAlumna': {
		// 	code: null,
		// 	subcomponents: {}
		// } });

		expect( state.components_per_route ).toEqual({
			'/':      { 'HelloAlumna': true }
		});

	});

});