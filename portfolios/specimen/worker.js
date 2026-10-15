// Grows the neuron off the main thread, so the page stays responsive while 32,768 splats are
// paired into their tree. main.js falls back to doing this itself where module workers fail.

import { neuron, prepare } from './specimen.js';

const { leaves, parts } = neuron();
const spec = prepare(leaves);
postMessage({ ...spec, parts }, [spec.rows.buffer]);
