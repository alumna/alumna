// Small Hjson reader for alumna.hjson: comments, unquoted keys, trailing commas.
// Not a full Hjson clone. Enough for port, base, ssg, out, title, sourcemap.

function parse_error (message) {
	const error = new Error(message);
	error.name = 'HjsonError';
	return error;
}

export function parse_hjson (text) {
	const s = String(text);
	const n = s.length;
	let i = 0;

	function skip () {
		while (i < n) {
			const c = s.charCodeAt(i);
			if (c === 32 || c === 9 || c === 13 || c === 10) {
				i++;
				continue;
			}
			if (c === 35) {
				while (i < n && s.charCodeAt(i) !== 10)
					i++;
				continue;
			}
			if (c === 47 && s.charCodeAt(i + 1) === 47) {
				i += 2;
				while (i < n && s.charCodeAt(i) !== 10)
					i++;
				continue;
			}
			if (c === 47 && s.charCodeAt(i + 1) === 42) {
				i += 2;
				while (i < n && !(s.charCodeAt(i) === 42 && s.charCodeAt(i + 1) === 47))
					i++;
				if (i >= n)
					throw parse_error('Unclosed comment in alumna.hjson');
				i += 2;
				continue;
			}
			break;
		}
	}

	function parse_string () {
		const q = s[i++];
		let out = '';
		while (i < n) {
			const ch = s[i++];
			if (ch === q)
				return out;
			if (ch !== '\\') {
				out += ch;
				continue;
			}
			if (i >= n)
				throw parse_error('Unclosed string in alumna.hjson');
			const e = s[i++];
			if (e === 'u') {
				const hex = s.slice(i, i + 4);
				if (!/^[0-9a-fA-F]{4}$/.test(hex))
					throw parse_error('Bad unicode escape in alumna.hjson');
				out += String.fromCharCode(parseInt(hex, 16));
				i += 4;
				continue;
			}
			const map = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' };
			out += map[e] !== undefined ? map[e] : e;
		}
		throw parse_error('Unclosed string in alumna.hjson');
	}

	function parse_number () {
		const start = i;
		if (s[i] === '-')
			i++;
		while (i < n && s[i] >= '0' && s[i] <= '9')
			i++;
		if (s[i] === '.') {
			i++;
			while (i < n && s[i] >= '0' && s[i] <= '9')
				i++;
		}
		if (s[i] === 'e' || s[i] === 'E') {
			i++;
			if (s[i] === '+' || s[i] === '-')
				i++;
			while (i < n && s[i] >= '0' && s[i] <= '9')
				i++;
		}
		const raw = s.slice(start, i);
		const num = Number(raw);
		if (!Number.isFinite(num))
			throw parse_error('Invalid number in alumna.hjson');
		return num;
	}

	function parse_key () {
		if (s[i] === '"' || s[i] === "'")
			return parse_string();
		const start = i;
		while (i < n) {
			const c = s.charCodeAt(i);
			if (c === 58 || c === 32 || c === 9 || c === 10 || c === 13 || c === 44)
				break;
			i++;
		}
		const key = s.slice(start, i).trim();
		if (!key)
			throw parse_error('Missing key in alumna.hjson');
		return key;
	}

	function parse_unquoted () {
		const start = i;
		while (i < n) {
			const c = s.charCodeAt(i);
			if (c === 44 || c === 125 || c === 93 || c === 10 || c === 13)
				break;
			if (c === 35)
				break;
			if (c === 47 && (s.charCodeAt(i + 1) === 47 || s.charCodeAt(i + 1) === 42))
				break;
			i++;
		}
		const raw = s.slice(start, i).trim();
		if (raw === '')
			throw parse_error('Missing value in alumna.hjson');
		if (raw === 'true')
			return true;
		if (raw === 'false')
			return false;
		if (raw === 'null')
			return null;
		return raw;
	}

	function parse_array () {
		i++;
		const out = [];
		while (i < n) {
			skip();
			if (s[i] === ']') {
				i++;
				return out;
			}
			if (s[i] === ',') {
				i++;
				continue;
			}
			out.push(parse_value());
			skip();
			if (s[i] === ',')
				i++;
		}
		throw parse_error('Unclosed array in alumna.hjson');
	}

	function parse_object (braces) {
		const out = {};
		if (braces)
			i++;
		for (;;) {
			skip();
			if (braces) {
				if (i >= n)
					throw parse_error('Unclosed object in alumna.hjson');
				if (s[i] === '}') {
					i++;
					return out;
				}
			}
			else if (i >= n) {
				return out;
			}
			if (s[i] === ',') {
				i++;
				continue;
			}
			if (!braces && s[i] === '}')
				throw parse_error('Unexpected } in alumna.hjson');
			const key = parse_key();
			skip();
			if (s[i] !== ':')
				throw parse_error('Expected : after key "' + key + '" in alumna.hjson');
			i++;
			out[key] = parse_value();
			skip();
			if (s[i] === ',')
				i++;
		}
	}

	function parse_value () {
		skip();
		if (i >= n)
			throw parse_error('Unexpected end of alumna.hjson');
		const c = s[i];
		if (c === '{')
			return parse_object(true);
		if (c === '[')
			return parse_array();
		if (c === '"' || c === "'")
			return parse_string();
		if (c === '-' || (c >= '0' && c <= '9'))
			return parse_number();
		return parse_unquoted();
	}

	skip();
	if (i >= n)
		return {};
	if (s[i] === '{')
		return parse_object(true);
	if (s[i] === '[')
		return parse_array();
	return parse_object(false);
}
