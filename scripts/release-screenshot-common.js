const path = require("path");

const ROOT = process.cwd();
const ARTIFACTS_ROOT = path.join(ROOT, "artifacts");
const RELEASE_ROOT = path.join(ARTIFACTS_ROOT, "release-screenshots");
const RELEASE_LATEST_ROOT = path.join(RELEASE_ROOT, "latest");

const RELEASE_SCREENSHOT_MAP = [
  {
    key: "home",
    label: "Practice Hub",
    sourceName: "01-home.png",
    exportName: "01-practice-hub.png",
    category: "store",
    note: "Primary hero and home CTA screenshot.",
  },
  {
    key: "progress",
    label: "Progress Dashboard",
    sourceName: "01c-progress.png",
    exportName: "02-progress-dashboard.png",
    category: "store",
    note: "Weekly progress and improvement view.",
  },
  {
    key: "profile",
    label: "Profile & Setup",
    sourceName: "01d-profile.png",
    exportName: "03-profile-setup.png",
    category: "marketing",
    note: "Identity, achievements, and practice setup.",
  },
  {
    key: "builder",
    label: "Session Builder",
    sourceName: "02-builder.png",
    exportName: "04-session-builder.png",
    category: "store",
    note: "Builder flow with editable drill chain.",
  },
  {
    key: "active",
    label: "Active Practice",
    sourceName: "03-active.png",
    exportName: "05-active-practice.png",
    category: "store",
    note: "Core live practice experience.",
  },
  {
    key: "complete",
    label: "Session Complete",
    sourceName: "04-complete.png",
    exportName: "06-session-complete.png",
    category: "marketing",
    note: "Reward and completion screen.",
  },
];

module.exports = {
  ARTIFACTS_ROOT,
  RELEASE_LATEST_ROOT,
  RELEASE_ROOT,
  RELEASE_SCREENSHOT_MAP,
  ROOT,
};
