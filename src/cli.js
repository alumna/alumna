#!/usr/bin/env node

import { Alumna } from './alumna.js';
import { boot_cli } from './cli/run.js';

await boot_cli(import.meta.url, process.argv, {
	Alumna,
	cwd: process.cwd()
});
