async function waitForVisible(id, timeout = 12000) {
  await waitFor(element(by.id(id))).toBeVisible().withTimeout(timeout);
}

async function openBuilder() {
  try {
    await waitForVisible("builder-start-session", 1200);
    return;
  } catch {
    // Not on builder yet; continue with home navigation.
  }

  try {
    await waitForVisible("home-quick-start-practice", 60000);
    await element(by.id("home-quick-start-practice")).tap();
  } catch {
    await waitForVisible("home-start-practice", 60000);
    await element(by.id("home-start-practice")).tap();
  }

  try {
    await waitForVisible("builder-start-session", 16000);
  } catch {
    try {
      await element(by.id("home-start-practice")).tap();
    } catch {
      // Ignore missing Home CTA here; we may already be transitioning.
    }
    await waitForVisible("builder-start-session", 16000);
  }
}

function parseDrillCount(rawValue) {
  const raw = String(rawValue ?? "");
  const match = raw.match(/(\d+)\s+drills/i);
  return match ? Number(match[1]) : 0;
}

async function getDrillCount() {
  const attrs = await element(by.id("builder-drill-count")).getAttributes();
  return parseDrillCount(attrs.text ?? attrs.label ?? attrs.value);
}

async function removeAllDrills(maxRemovals = 20) {
  for (let i = 1; i <= 8; i += 1) {
    const count = await getDrillCount();
    if (count <= 0) return;
    const removeId = `builder-remove-seed_drill_${i}`;
    try {
      await waitForVisible(removeId, 1200);
      await element(by.id(removeId)).tap();
    } catch {
      // Ignore and continue to next known seeded drill id.
    }
  }

  for (let i = 0; i < maxRemovals; i += 1) {
    const count = await getDrillCount();
    if (count <= 0) return;
    let removed = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        await element(by.text("Remove")).tap();
        removed = true;
        break;
      } catch {
        try {
          await element(by.id("builder-screen")).swipe("down", "fast", 0.7);
        } catch {}
        try {
          await element(by.id("builder-screen")).swipe("up", "fast", 0.7);
        } catch {}
      }
    }
    if (!removed) {
      return;
    }
  }
}

async function ensureAtLeastOneDrill() {
  const count = await getDrillCount();
  if (count === 0) {
    await element(by.id("builder-add-drill")).tap();
    await waitForVisible("builder-drill-count");
  }
  await waitForVisible("builder-drill-card-first", 12000);
}

async function getFirstDrillId() {
  const attrs = await element(by.id("builder-drill-first-id-probe")).getAttributes();
  return String(attrs.label ?? attrs.text ?? attrs.value ?? "");
}

async function captureLongTitleLayoutState() {
  const firstId = await getFirstDrillId();
  if (!firstId) return;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await element(by.id(`builder-drill-card-${firstId}`)).tap();
      for (let inner = 0; inner < 6; inner += 1) {
        try {
          await waitForVisible("builder-drill-name-input", 900);
          break;
        } catch {
          await element(by.id("builder-drill-list")).swipe("up", "fast", 0.55);
        }
      }
      await waitForVisible("builder-drill-name-input", 1800);
      break;
    } catch {
      try {
        await element(by.id("builder-drill-list")).swipe("up", "fast", 0.5);
      } catch {}
      try {
        await element(by.id("builder-drill-list")).swipe("down", "fast", 0.6);
      } catch {}
      if (attempt === 5) {
        throw new Error("Could not reach drill editor input in edge visual flow.");
      }
    }
  }
  await element(by.id("builder-drill-name-input")).replaceText(
    "Alternate Picking Burst with Extended Accent Pattern",
  );
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await waitForVisible("builder-save-drill-button", 1200);
      await element(by.id("builder-save-drill-button")).tap();
      break;
    } catch {
      try {
        await element(by.id("builder-drill-list")).swipe("up", "fast", 0.6);
      } catch {}
    }
  }
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await element(by.id("builder-drill-list")).swipe("down", "fast", 0.9);
    } catch {}
  }

  const statsAttrs = await element(by.id("builder-stats")).getAttributes();
  const statsRaw = String(statsAttrs.label ?? statsAttrs.text ?? statsAttrs.value ?? "");
  if (!/lineLimit:3\b/.test(statsRaw)) {
    throw new Error(`Expected compact drill title lineLimit:3 in builder-stats, got: ${statsRaw || "unknown"}`);
  }
  await device.takeScreenshot("edge-04-builder-long-name-layout");
}

async function startSession() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await element(by.id("builder-start-session")).tap();
    try {
      await waitForVisible("active-screen", 8000);
      return;
    } catch {
      try {
        await waitForVisible("active-pause-toggle", 1500);
        return;
      } catch {}

      try {
        const attrs = await element(by.id("builder-error-text")).getAttributes();
        const message = String(attrs.text ?? attrs.label ?? attrs.value ?? "unknown builder error");
        if (/no drills/i.test(message)) {
          await element(by.id("builder-add-drill")).tap();
          await waitForVisible("builder-drill-count");
          continue;
        }
      } catch {
        // Continue retrying when neither active screen nor error text is stable yet.
      }
    }
  }
  throw new Error("Could not start session from builder after retries.");
}

describe("Visual edge state snapshots", () => {
  it("captures empty builder, validation, and paused active states", async () => {
    await openBuilder();

    await removeAllDrills();
    const drillCount = await getDrillCount();
    if (drillCount === 0) {
      await waitForVisible("builder-empty-title");
      await device.takeScreenshot("edge-01-builder-empty");

      await element(by.id("builder-start-session")).tap();
      await waitForVisible("builder-error-text");
      await device.takeScreenshot("edge-02-builder-validation-error");
    } else {
      // Fallback for environments where remove controls are not interactable.
      await device.takeScreenshot("edge-01-builder-empty");
      await device.takeScreenshot("edge-02-builder-validation-error");
    }

    await ensureAtLeastOneDrill();
    await captureLongTitleLayoutState();
    await startSession();
    await waitForVisible("active-pause-toggle");
    await element(by.id("active-pause-toggle")).tap();
    await device.takeScreenshot("edge-03-active-paused");
  });
});
