import topicsJson from './topics.json' with { type: 'json' };
import resourcesJson from './resources.json' with { type: 'json' };
import writingJson from './writing.json' with { type: 'json' };
import citationJson from './citation.json' with { type: 'json' };
import type { Citation, Resource, Topic, WritingSample } from '../types.js';

export const topics = topicsJson as Topic[];
export const resources = resourcesJson as Resource[];
export const writingSamples = writingJson as WritingSample[];
export const citation = citationJson as Citation;
