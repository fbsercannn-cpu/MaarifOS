import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { wordDesignFixtures } from "../../tests/fixtures/word-design-fixtures.mjs";
const directory = resolve(process.argv[2] ?? "output/word-design-qa");
await mkdir(directory, { recursive: true });
for (const file of await wordDesignFixtures()) await writeFile(resolve(directory, file.name), file.bytes);
console.log(directory);
