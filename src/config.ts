import pkg from '../package.json';

/** Static metadata about the API, sourced from the published package. */
export const API = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
} as const;
