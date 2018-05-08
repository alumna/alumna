import { EOL } 		from 'os';
import translate 	from './../../src/generators/all/translate';

test('Translation of a component that uses svelte shared helpers', () => {

	const name = 'Teste';
	const code = 'import { addListener, appendNode, assign } from "svelte/shared.js";' + 'export default ' + name + ';'

	expect.assertions(1);

	return translate( code, name ).then( code => {

		expect( code ).toEqual(
			'(function () { "use strict";' + EOL
			+ 'var addListener = Altiva.shared.addListener;' + EOL
			+ 'var appendNode = Altiva.shared.appendNode;' + EOL
			+ 'var assign = Altiva.shared.assign;' + EOL
			+ EOL + 'return ' + name + ';' + EOL + '}())'
		);

	});
});

test('Translation of a component that doesn\'t use svelte shared helpers', () => {

	const name = 'Teste';
	const code = 'import { addListener, appendNode, assign } from "wahtever.js";' + 'export default ' + name + ';'

	expect.assertions(1);

	return translate( code, name ).then( code => {

		expect( code ).toEqual(
			'(function () { "use strict";' + EOL
			+ 'import { addListener, appendNode, assign } from "wahtever.js";'
			+ EOL + 'return ' + name + ';' + EOL + '}())'
		);

	});
});

test('Translation of a component that doesn\'t import anything', () => {

	const name = 'Teste';
	const code = 'export default ' + name + ';'

	expect.assertions(1);

	return translate( code, name ).then( code => {

		expect( code ).toEqual(
			'(function () { "use strict";' + EOL
			+ EOL + 'return ' + name + ';' + EOL + '}())'
		);

	});
});