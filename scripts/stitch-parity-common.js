const path = require('path');

const ROOT = process.cwd();

const REFERENCE_ROOT = path.join(ROOT, 'docs', 'design-import', 'stitch', 'stitch');
const LATEST_ROOT = path.join(ROOT, 'artifacts', 'stitch-parity', 'latest');
const DIFF_ROOT = path.join(ROOT, 'artifacts', 'stitch-parity', 'diff');

const PARITY_MAP = [
  {
    key: 'main_practice_hub',
    label: 'Practice Hub',
    reference: path.join(REFERENCE_ROOT, 'main_practice_hub', 'screen.png'),
    latestName: '01-home.png',
    required: true,
  },
  {
    key: 'drill_builder',
    label: 'Build Your Chain',
    reference: path.join(REFERENCE_ROOT, 'drill_builder', 'screen.png'),
    latestName: '02-builder.png',
    required: true,
  },
  {
    key: 'practice_session',
    label: 'Practice Session',
    reference: path.join(REFERENCE_ROOT, 'practice_session', 'screen.png'),
    latestName: '03-active.png',
    required: true,
  },
  {
    key: 'session_summary',
    label: 'Session Summary',
    reference: path.join(REFERENCE_ROOT, 'session_summary', 'screen.png'),
    latestName: '04-complete.png',
    required: true,
  },
  {
    key: 'songs_library',
    label: 'Songs & Library',
    reference: path.join(REFERENCE_ROOT, 'songs_library', 'screen.png'),
    latestName: '01b-songs.png',
    required: false,
  },
  {
    key: 'progress_dashboard',
    label: 'Progress Dashboard',
    reference: path.join(REFERENCE_ROOT, 'progress_dashboard', 'screen.png'),
    latestName: '01c-progress.png',
    required: false,
  },
];

module.exports = {
  ROOT,
  REFERENCE_ROOT,
  LATEST_ROOT,
  DIFF_ROOT,
  PARITY_MAP,
};
