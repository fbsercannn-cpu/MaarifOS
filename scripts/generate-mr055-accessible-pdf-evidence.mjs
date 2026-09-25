import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSemanticTaggedPdf } from "../src/features/documents/semantic-tagged-pdf.ts";

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fontBytes = new Uint8Array(await readFile(path.join(
  appDirectory,
  "public/assets/fonts/MaarifOSSans-Regular.ttf",
)));
const outputDirectory = path.join(appDirectory, "output/pdf/mr055-accessible-plan");
const outputPath = path.join(outputDirectory, "plan-semantic-sample.pdf");

const bytes = await createSemanticTaggedPdf(
  {
    title: "Eylül günlük öğretmen planı",
    language: "tr-TR",
    creator: "MaarifOS",
    nodes: [
      { kind: "heading", level: 1, text: "Eylül günlük öğretmen planı" },
      { kind: "paragraph", tone: "meta", text: "Türkiye Yüzyılı Maarif Modeli · 48–60 ay" },
      { kind: "heading", level: 2, text: "Günün öğrenme akışı" },
      {
        kind: "paragraph",
        text: "Çocuklar gölgelerin gün içinde nasıl değiştiğini özgür oyun ve gözlemle araştırır.",
      },
      {
        kind: "list",
        items: [
          "Bahçede güvenli bir gözlem alanı belirlenir.",
          "Çocukların sözleri yorum eklenmeden kaydedilir.",
          "Sonraki gün için öğretmen kararı görünür biçimde yazılır.",
        ],
      },
      { kind: "heading", level: 2, text: "Gün çizelgesi" },
      {
        kind: "table",
        summary: "Saat, akış ve gözlem odağı çizelgesi",
        headers: ["Saat", "Akış", "Gözlem odağı"],
        rows: [
          ["09:00", "Karşılama", "Çocuğun bağımsız seçimi"],
          ["10:00", "Gölge izleri", "Karşılaştırma dili"],
          ["11:30", "Yansıtma", "Çocuğun kendi sözü"],
        ],
      },
      {
        kind: "figure",
        altText: "Sabah, öğle ve ikindi saatlerinde gölge boylarının değişimini gösteren üç bölümlü çizim",
        caption: "Gölgenin gün içindeki değişimi",
        height: 96,
      },
    ],
  },
  { fontBytes },
);

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, bytes, { flag: "w" });
process.stdout.write(`${outputPath}\n`);
