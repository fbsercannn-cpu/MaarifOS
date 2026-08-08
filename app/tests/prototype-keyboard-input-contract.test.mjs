import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const prototypeSource = await readFile(
  new URL("../src/Prototype.tsx", import.meta.url),
  "utf8",
);

function jsxTags(componentName) {
  return [...prototypeSource.matchAll(
    new RegExp(`<${componentName}\\b[\\s\\S]*?\\/>`, "g"),
  )].map((match) => match[0]);
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1] ?? null;
}

test("Prototype metin girişlerini mobil klavye bileşenlerinden geçirir", () => {
  assert.equal(
    /<textarea\b/.test(prototypeSource),
    false,
    "Prototype içinde ham textarea kullanılamaz.",
  );

  const permittedNativeTypes = new Set([
    "checkbox",
    "radio",
    "file",
    "color",
    "range",
  ]);

  for (const tag of jsxTags("input")) {
    const type = attribute(tag, "type");
    assert.ok(
      type && permittedNativeTypes.has(type),
      `Ham input yalnız native kontrol türlerinde kalabilir; bulunan tür: ${type ?? "varsayılan text"}.`,
    );
  }

  const expectedKeyboardInputs = new Map([
    ["academic-year-start", "date"],
    ["academic-year-end", "date"],
    ["schedule-start", "time"],
    ["schedule-end", "time"],
    ["app-lock-pin", "password"],
    ["app-lock-pin-confirm", "password"],
    ["backup-password", "password"],
    ["backup-password-confirm", "password"],
    ["restore-password", "password"],
    ["app-unlock-pin", "password"],
  ]);

  const keyboardInputsById = new Map(
    jsxTags("KeyboardInput")
      .map((tag) => [attribute(tag, "id"), tag])
      .filter(([id]) => id),
  );

  for (const [id, expectedType] of expectedKeyboardInputs) {
    const tag = keyboardInputsById.get(id);
    assert.ok(tag, `${id} KeyboardInput ile sunulmalıdır.`);
    assert.equal(attribute(tag, "type"), expectedType);
  }
});
