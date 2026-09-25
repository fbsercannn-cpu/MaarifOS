import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("Android package registers exact OAuth callback and hardware-backed session storage", async () => {
  const [manifest, activity, plugin] = await Promise.all([
    read("android/app/src/main/AndroidManifest.xml"),
    read("android/app/src/main/java/tr/gov/meb/maarifos/MainActivity.java"),
    read("android/app/src/main/java/tr/gov/meb/maarifos/SecureSessionPlugin.java"),
  ]);
  assert.match(manifest, /android:allowBackup="false"/u);
  assert.match(manifest, /android:scheme="maarifos"/u);
  assert.match(manifest, /android:host="auth"/u);
  assert.match(manifest, /android:pathPrefix="\/callback"/u);
  assert.match(activity, /registerPlugin\(SecureSessionPlugin\.class\)/u);
  assert.match(plugin, /AndroidKeyStore/u);
  assert.match(plugin, /AES\/GCM\/NoPadding/u);
  assert.doesNotMatch(plugin, /System\.out|Log\./u);
});

test("iOS package registers exact OAuth scheme and device-only Keychain storage", async () => {
  const [info, storyboard, controller, plugin, project] = await Promise.all([
    read("ios/App/App/Info.plist"),
    read("ios/App/App/Base.lproj/Main.storyboard"),
    read("ios/App/App/MyViewController.swift"),
    read("ios/App/App/SecureSessionPlugin.swift"),
    read("ios/App/App.xcodeproj/project.pbxproj"),
  ]);
  assert.match(info, /<string>maarifos<\/string>/u);
  assert.match(storyboard, /customClass="MyViewController"/u);
  assert.match(controller, /registerPluginInstance\(SecureSessionPlugin\(\)\)/u);
  assert.match(plugin, /kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly/u);
  assert.match(project, /SecureSessionPlugin\.swift in Sources/u);
  assert.match(project, /MyViewController\.swift in Sources/u);
  assert.doesNotMatch(plugin, /print\(/u);
});

test("native OAuth secrets never fall back to browser storage", async () => {
  const sources = await Promise.all([
    read("src/native/native-account.ts"),
    read("src/native/secure-session.ts"),
    read("src/native/auth-callback.ts"),
  ]);
  const combined = sources.join("\n");
  assert.doesNotMatch(combined, /localStorage|sessionStorage|indexedDB/u);
  assert.doesNotMatch(combined, /console\.(?:log|error|warn)/u);
  assert.match(combined, /maarifos:\/\/auth\/callback/u);
});

test("native packages expose the same public version as package.json", async () => {
  const [packageJson, android, ios] = await Promise.all([
    read("package.json").then(JSON.parse),
    read("android/app/build.gradle"),
    read("ios/App/App.xcodeproj/project.pbxproj"),
  ]);
  const escapedVersion = packageJson.version.replaceAll(".", "\\.");
  assert.match(android, new RegExp(`versionName "${escapedVersion}"`, "u"));
  assert.match(ios, new RegExp(`MARKETING_VERSION = ${escapedVersion};`, "u"));
});
