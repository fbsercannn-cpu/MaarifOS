import assert from "node:assert/strict";
import test from "node:test";
import { resizeFormTextarea } from "../../src/features/official-forms/useFormEditorSizing.ts";

test("editor textarea fits its complete content including borders and can shrink", () => {
  const old = globalThis.getComputedStyle;
  globalThis.getComputedStyle = () => ({ borderTopWidth: "1.5px", borderBottomWidth: "1.5px" });
  try {
    const field = { getClientRects: () => [{}], style: { height: "88px" }, scrollHeight: 302.2 };
    resizeFormTextarea(field);
    assert.equal(field.style.height, "306px");
    assert.equal(field.style.overflowY, "hidden");
    field.scrollHeight = 74;
    resizeFormTextarea(field);
    assert.equal(field.style.height, "77px");
  } finally { globalThis.getComputedStyle = old; }
});

test("hidden print/form textareas retain their geometry until visible", () => {
  const field = { getClientRects: () => [], style: { height: "88px" }, scrollHeight: 0 };
  resizeFormTextarea(field);
  assert.equal(field.style.height, "88px");
  assert.equal(field.style.overflowY, undefined);
});
