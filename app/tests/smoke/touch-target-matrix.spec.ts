import { expect, test, type Page } from "@playwright/test";

import {
  addAccessibilityChild,
  configureAccessibilityClassroom,
  PHONE_VIEWPORT_WIDTHS,
} from "./accessibility-fixtures";

const MINIMUM_TOUCH_TARGET_PX = 44;
const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "summary",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='tab']",
  "[role='menuitem']",
  "[role='gridcell']",
].join(",");

type TouchTargetViolation = Readonly<{
  viewport: string;
  state: string;
  selector: string;
  label: string;
  tag: string;
  role: string;
  width: number;
  height: number;
  ownWidth: number;
  ownHeight: number;
}>;

async function collectUndersizedTouchTargets(
  page: Page,
  state: string,
): Promise<TouchTargetViolation[]> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Dokunma hedefi testi için viewport bulunamadı.");

  return page.locator(INTERACTIVE_SELECTOR).evaluateAll(
    (elements, context) => {
      const round = (value: number) => Math.round(value * 10) / 10;
      const isRendered = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity) === 0 ||
          element.closest("[hidden], [inert], [aria-hidden='true']")
        ) {
          return false;
        }
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const selectorSegment = (element: HTMLElement) => {
        if (element.id) return `#${CSS.escape(element.id)}`;
        const testId = element.getAttribute("data-testid");
        if (testId) return `[data-testid=${JSON.stringify(testId)}]`;
        const ariaLabel = element.getAttribute("aria-label");
        if (ariaLabel) {
          return `${element.tagName.toLowerCase()}[aria-label=${JSON.stringify(ariaLabel)}]`;
        }
        const className = [...element.classList].slice(0, 2).map((name) => `.${CSS.escape(name)}`).join("");
        const parent = element.parentElement;
        const sameTag = parent
          ? [...parent.children].filter((child) => child.tagName === element.tagName)
          : [];
        const position = sameTag.length > 1 ? `:nth-of-type(${sameTag.indexOf(element) + 1})` : "";
        return `${element.tagName.toLowerCase()}${className}${position}`;
      };
      const selectorFor = (element: HTMLElement) => {
        const own = selectorSegment(element);
        if (own.startsWith("#") || own.startsWith("[data-testid")) return own;
        const parent = element.parentElement;
        if (!parent) return own;
        return `${selectorSegment(parent)} > ${own}`;
      };
      const labelFor = (element: HTMLElement) => {
        const candidates = [
          element.getAttribute("aria-label"),
          element.getAttribute("title"),
          element instanceof HTMLInputElement ? element.placeholder : null,
          element.textContent,
        ];
        return (candidates.find((value) => value?.trim()) ?? "")
          .replace(/\s+/gu, " ")
          .trim()
          .slice(0, 120);
      };
      const effectiveRect = (element: HTMLElement) => {
        const own = element.getBoundingClientRect();
        if (
          element instanceof HTMLInputElement &&
          ["checkbox", "radio", "file"].includes(element.type)
        ) {
          const labels = [...element.labels ?? []].filter((label) => isRendered(label));
          const largest = labels
            .map((label) => label.getBoundingClientRect())
            .sort((left, right) => right.width * right.height - left.width * left.height)[0];
          if (largest) return largest;
        }
        return own;
      };

      const seen = new Set<HTMLElement>();
      const failures: Array<{
        viewport: string;
        state: string;
        selector: string;
        label: string;
        tag: string;
        role: string;
        width: number;
        height: number;
        ownWidth: number;
        ownHeight: number;
      }> = [];

      for (const candidate of elements) {
        const element = candidate as HTMLElement;
        if (seen.has(element) || !isRendered(element)) continue;
        seen.add(element);
        if (
          (element instanceof HTMLButtonElement ||
            element instanceof HTMLInputElement ||
            element instanceof HTMLSelectElement ||
            element instanceof HTMLTextAreaElement) &&
          element.disabled
        ) {
          continue;
        }
        if (getComputedStyle(element).pointerEvents === "none") continue;

        const own = element.getBoundingClientRect();
        const effective = effectiveRect(element);
        if (
          effective.width + 0.01 >= context.minimum &&
          effective.height + 0.01 >= context.minimum
        ) {
          continue;
        }
        failures.push({
          viewport: `${context.width}x${context.height}`,
          state: context.state,
          selector: selectorFor(element),
          label: labelFor(element),
          tag: element.tagName.toLowerCase(),
          role: element.getAttribute("role") ?? element.tagName.toLowerCase(),
          width: round(effective.width),
          height: round(effective.height),
          ownWidth: round(own.width),
          ownHeight: round(own.height),
        });
      }
      return failures;
    },
    {
      minimum: MINIMUM_TOUCH_TARGET_PX,
      state,
      width: viewport.width,
      height: viewport.height,
    },
  );
}

test.describe("44×44 mobil dokunma hedefi matrisi", () => {
  test.setTimeout(150_000);

  for (const width of PHONE_VIEWPORT_WIDTHS) {
    test(`${width}px genişlikte bütün kritik durumların hedefleri en az 44×44`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      const failures: TouchTargetViolation[] = [];
      const audit = async (state: string) => {
        failures.push(...await collectUndersizedTouchTargets(page, state));
      };

      await page.goto("/?native=1", { waitUntil: "networkidle" });
      await expect(page.getByRole("dialog", { name: "Sınıfını hazırla" })).toBeVisible();
      await audit("ilk-kurulum-modal");

      await configureAccessibilityClassroom(page);
      await expect(page.getByTestId("today-screen")).toBeVisible();
      await audit("bugun-bos");

      await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
      await expect(page.getByText("Henüz çocuk eklenmedi", { exact: true })).toBeVisible();
      await audit("sinif-bos");

      await addAccessibilityChild(page);
      await expect(page.getByRole("main", { name: "Sınıfım" })).toBeVisible();
      await audit("sinif-dolu");

      const routes = [
        ["Bugün", "bugun-dolu", page.getByTestId("today-screen")],
        ["Planlar", "planlar-dolu", page.getByRole("heading", { name: "Planlar", exact: true })],
        ["Belgeler", "belgeler-dolu", page.getByRole("heading", { name: "Belgeler", exact: true })],
      ] as const;
      for (const [navigation, state, ready] of routes) {
        await page.getByRole("button", { name: navigation, exact: true }).click();
        await expect(ready).toBeVisible();
        await audit(state);
      }

      await page.getByRole("button", { name: "Sınıfım", exact: true }).click();
      await page
        .locator("button.simple-student-list__profile")
        .filter({ hasText: "Kurgu Erişilebilirlik Çocuğu" })
        .click();
      const profile = page.getByRole("dialog", {
        name: "Kurgu Erişilebilirlik Çocuğu profili",
      });
      await expect(profile).toBeVisible();
      const profileDetails = profile.locator("details.student-profile-context-details");
      await profile.getByText("Kayıt arşivi ve çocuk bilgileri", { exact: true }).click();
      await expect(profileDetails).toHaveAttribute("open", "");
      const profileTabs = profile.getByRole("navigation", {
        name: "Çocuk profili bölümleri",
      });
      await expect(profileTabs.getByRole("button")).toHaveCount(5);
      const tabMetrics = await profileTabs.getByRole("button").evaluateAll((buttons) => {
        const parentRect = buttons[0]?.parentElement?.getBoundingClientRect();
        return buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            label: button.textContent?.trim() ?? "",
            fontSize: Number.parseFloat(getComputedStyle(button).fontSize),
            width: rect.width,
            height: rect.height,
            insideParent:
              Boolean(parentRect) &&
              rect.left >= (parentRect?.left ?? 0) - 0.5 &&
              rect.right <= (parentRect?.right ?? 0) + 0.5,
          };
        });
      });
      expect(tabMetrics.every(({ fontSize }) => fontSize >= 12), JSON.stringify(tabMetrics)).toBe(true);
      expect(tabMetrics.every(({ width, height }) => width >= 44 && height >= 44), JSON.stringify(tabMetrics)).toBe(true);
      expect(tabMetrics.every(({ insideParent }) => insideParent), JSON.stringify(tabMetrics)).toBe(true);
      await audit("cocuk-profili-modal");
      await page
        .getByRole("button", {
          name: "Kurgu Erişilebilirlik Çocuğu profili ekranını kapat",
        })
        .click();

      await page.getByRole("button", { name: "Gözlem", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Hızlı Gözlem" })).toBeVisible();
      await audit("hizli-gozlem-dolu");

      if (testInfo.project.name.startsWith("live-")) {
        await page.evaluate(() =>
          localStorage.removeItem("maarifos.shared-invite-access.v1"),
        );
      }
      await page.goto("/?native=1&accessGate=1", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "MaarifOS’a hoş geldiniz" })).toBeVisible();
      await audit("davet-kapisi-bos");
      await page.getByLabel("6 haneli davet kodu").fill("000000");
      await page.getByRole("button", { name: "MaarifOS’a gir" }).click();
      await expect(page.getByRole("alert")).toContainText("Kod doğrulanamadı");
      await audit("davet-kapisi-hata");

      if (failures.length > 0) {
        await testInfo.attach(`touch-target-failures-${width}px.json`, {
          body: Buffer.from(JSON.stringify(failures, null, 2)),
          contentType: "application/json",
        });
      }
      expect(
        failures,
        `${width}px viewportta 44×44 altındaki hedefler bulundu; selector, etiket, ölçü ve durum listelenmiştir`,
      ).toEqual([]);
    });
  }
});
