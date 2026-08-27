#!/usr/bin/env node

import { Alumna } from './alumna.js';
import { boot_cli } from './cli/run.js';
import { is_compiled_url, set_compiled } from './utils/embedded.js';

set_compiled(is_compiled_url(import.meta.url));

await boot_cli(import.meta.url, process.argv, {
	Alumna,
	cwd: process.cwd()
});
