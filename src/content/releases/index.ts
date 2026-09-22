import type { Release } from '@types';

import v1_0_0 from './1.0.0.json';
import v1_0_1 from './1.0.1.json';
import v1_1_0 from './1.1.0.json';
import v1_2_0 from './1.2.0.json';
import v1_3_0 from './1.3.0.json';
import v1_3_1 from './1.3.1.json';
import v1_4_0 from './1.4.0.json';
import v1_4_1 from './1.4.1.json';
import v1_5_0 from './1.5.0.json';
import v1_6_0 from './1.6.0.json';
import v1_6_1 from './1.6.1.json';
import v1_7_0 from './1.7.0.json';
import v1_7_1 from './1.7.1.json';
import v1_7_2 from './1.7.2.json';

/**
 * User-facing release notes, newest first.
 *
 * Each release is a JSON file in this directory, imported explicitly below. The
 * imports are deliberate rather than a directory read: `fs.readdirSync` is not
 * statically analysable, so Next would not trace the JSON files into the
 * serverless bundle and the changelog page would render empty in production.
 *
 * When cutting a release, add the file and one import line here. See RELEASING.md.
 */
export const RELEASES: Release[] = [
  v1_7_2 as Release,
  v1_7_1 as Release,
  v1_7_0 as Release,
  v1_6_1 as Release,
  v1_6_0 as Release,
  v1_5_0 as Release,
  v1_4_1 as Release,
  v1_4_0 as Release,
  v1_3_1 as Release,
  v1_3_0 as Release,
  v1_2_0 as Release,
  v1_1_0 as Release,
  v1_0_1 as Release,
  v1_0_0 as Release,
];
