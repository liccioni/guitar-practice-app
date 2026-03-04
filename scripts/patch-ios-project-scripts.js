const fs = require('fs');
const path = require('path');

const workspaceRoot = process.cwd();
const podsPbxproj = path.join(workspaceRoot, 'ios', 'Pods', 'Pods.xcodeproj', 'project.pbxproj');
const appPbxproj = path.join(workspaceRoot, 'ios', 'GuitarPractice.xcodeproj', 'project.pbxproj');

let changed = false;

function replaceInFile(filePath, before, after, label) {
  if (!fs.existsSync(filePath)) {
    console.log(`[patch-ios-project] Skipped ${label}: ${filePath} not found.`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(after)) {
    console.log(`[patch-ios-project] ${label} already patched.`);
    return;
  }

  if (!content.includes(before)) {
    console.log(`[patch-ios-project] ${label} signature not found.`);
    return;
  }

  fs.writeFileSync(filePath, content.replace(before, after), 'utf8');
  changed = true;
  console.log(`[patch-ios-project] Patched ${label}.`);
}

const podsBefore = 'shellScript = "bash -l -c \\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\\"";';
const podsAfter = 'shellScript = "bash -l -c \\\"\\\\\\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\\\\\\"\\\"";';

const appBefore =
  '`\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\"`\\n\\n';
const appAfter =
  'RN_XCODE_SCRIPT=\\"$(\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\"\\)\\"\\n\\"$RN_XCODE_SCRIPT\\"\\n\\n';

replaceInFile(podsPbxproj, podsBefore, podsAfter, 'Pods EXConstants script');
replaceInFile(appPbxproj, appBefore, appAfter, 'App bundle script');

if (!changed) {
  console.log('[patch-ios-project] No changes made.');
}
