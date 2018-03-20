import newProject	from './modes/new.js';
import dev			from './modes/dev.js';
import build		from './modes/build.js';

// Util to update the user's altiva.hjson, used in all modes
import update		from './utils/altivaOptions.js';

const altiva = {
	
	newProject,
	dev,
	build,
	update
};

export default altiva;

