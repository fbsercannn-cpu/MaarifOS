import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export const PROTECTED_RUNTIME_FILE_DESCRIPTORS = Object.freeze([
  { path: "scripts/check-mobile-runtime.mjs", kind: "text" },
  { path: "scripts/prepare-sites-build.mjs", kind: "text" },
  { path: "scripts/runtime-integrity.mjs", kind: "text" },
  { path: "scripts/update-mobile-runtime-lock.mjs", kind: "text" },
  { path: "index.html", kind: "text" },
  { path: "vite.config.ts", kind: "text" },
  { path: "src/App.tsx", kind: "text" },
  { path: "src/main.tsx", kind: "text" },
  { path: "src/pwa.ts", kind: "text" },
  { path: "src/release.ts", kind: "text" },
  { path: "src/styles.css", kind: "text" },
  { path: "src/mobile/BottomSheet.tsx", kind: "text" },
  { path: "src/mobile/Carousel.tsx", kind: "text" },
  { path: "src/mobile/Device.tsx", kind: "text" },
  { path: "src/mobile/FlowStack.tsx", kind: "text" },
  { path: "src/mobile/Keyboard.tsx", kind: "text" },
  { path: "src/mobile/MobileCursor.tsx", kind: "text" },
  { path: "src/mobile/MobileRuntime.tsx", kind: "text" },
  { path: "src/mobile/MobileScroll.tsx", kind: "text" },
  { path: "src/mobile/PhoneFrame.tsx", kind: "text" },
  { path: "src/mobile/assets.ts", kind: "text" },
  { path: "src/mobile/components.tsx", kind: "text" },
  { path: "src/mobile/geometry.ts", kind: "text" },
  { path: "src/mobile/index.ts", kind: "text" },
  { path: "public/manifest.webmanifest", kind: "text" },
  { path: "public/sw.js", kind: "text" },
  { path: "public/assets/iphone/Bezel.png", kind: "binary" },
  { path: "public/assets/iphone/Keyboard.png", kind: "binary" },
  { path: "public/assets/android/Pixel10.png", kind: "binary" },
  { path: "public/assets/android/Keyboard.png", kind: "binary" },
  { path: "public/assets/android/navigation-bar.svg", kind: "text" },
  { path: "public/assets/status/status-icons.svg", kind: "text" },
  { path: "public/assets/status/ios-status-icons.svg", kind: "text" },
  { path: "worker/index.js", kind: "text" },
]);

export const PROTECTED_RUNTIME_FILES = Object.freeze(
  PROTECTED_RUNTIME_FILE_DESCRIPTORS.map((descriptor) => descriptor.path),
);

const protectedRuntimeFileSet = new Set(PROTECTED_RUNTIME_FILES);
const runtimeFileKindByPath = new Map(
  PROTECTED_RUNTIME_FILE_DESCRIPTORS.map((descriptor) => [descriptor.path, descriptor.kind]),
);

const normalizeCrlfBytes = (bytes) => {
  const normalized = [];
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] === 0x0d && bytes[index + 1] === 0x0a) continue;
    normalized.push(bytes[index]);
  }
  return Buffer.from(normalized);
};

export const canonicalRuntimeBytes = (relativePath, bytes) => {
  if (!protectedRuntimeFileSet.has(relativePath)) {
    throw new Error(`Unknown protected runtime file: ${relativePath}`);
  }

  if (runtimeFileKindByPath.get(relativePath) === "binary") return bytes;
  return normalizeCrlfBytes(bytes);
};

export const hashProtectedRuntimeFile = (root, relativePath) => {
  const filePath = path.join(root, relativePath);
  const bytes = canonicalRuntimeBytes(relativePath, readFileSync(filePath));
  return createHash("sha256").update(bytes).digest("hex");
};
