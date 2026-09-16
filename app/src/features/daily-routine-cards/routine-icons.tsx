import type { RoutineIcon } from "../../core/domain/daily-routine-cards.ts";
export const routineIconLabels: Record<RoutineIcon, string> = { sun: "Güneş", blocks: "Oyun blokları", circle: "Çember", palette: "Sanat", meal: "Beslenme", tree: "Ağaç", book: "Kitap", moon: "Dinlenme", group: "Arkadaşlar", home: "Ev" };
export const routineIconColors: Record<RoutineIcon, string> = { sun: "#bd720a", blocks: "#4962a8", circle: "#9d4e79", palette: "#a44851", meal: "#368071", tree: "#4e7c42", book: "#4669a0", moon: "#78649c", group: "#ac6540", home: "#50796d" };
// One offline drawing source for both the screen SVG and the PDF canvas.
export const routineIconPaths: Record<RoutineIcon, string[]> = {
  sun: ["M50 27 A23 23 0 1 0 50 73 A23 23 0 1 0 50 27", "M50 5V17 M50 83V95 M5 50H17 M83 50H95 M18 18L27 27 M73 73L82 82 M18 82L27 73 M73 27L82 18"],
  blocks: ["M10 50H48V88H10Z M52 50H90V88H52Z M31 8H69V46H31Z", "M23 69H35 M71 60V78 M40 27H60 M50 17V37"],
  circle: ["M50 30A20 20 0 1 0 50 70A20 20 0 1 0 50 30", "M50 5A7 7 0 1 0 50 19A7 7 0 1 0 50 5 M50 81A7 7 0 1 0 50 95A7 7 0 1 0 50 81 M12 43A7 7 0 1 0 12 57A7 7 0 1 0 12 43 M88 43A7 7 0 1 0 88 57A7 7 0 1 0 88 43"],
  palette: ["M53 10C17 10 5 42 13 66C18 82 38 94 48 86C57 79 41 67 55 61C65 57 75 70 85 58C100 38 79 10 53 10Z", "M30 32A4 4 0 1 0 30 40A4 4 0 1 0 30 32 M52 22A4 4 0 1 0 52 30A4 4 0 1 0 52 22 M74 32A4 4 0 1 0 74 40A4 4 0 1 0 74 32 M25 56A4 4 0 1 0 25 64A4 4 0 1 0 25 56"],
  meal: ["M48 22A28 28 0 1 0 48 78A28 28 0 1 0 48 22 M48 34A16 16 0 1 0 48 66A16 16 0 1 0 48 34", "M8 15V42Q14 52 20 42V15 M14 15V86 M87 14V86 M87 14Q73 34 87 48"],
  tree: ["M50 9L25 39H36L14 65H42V90H58V65H86L64 39H75Z", "M31 90H69"],
  book: ["M50 24Q30 11 10 20V80Q30 71 50 84Q70 71 90 80V20Q70 11 50 24V84", "M22 33L38 37 M22 47L38 51 M22 61L38 65 M62 37L78 33 M62 51L78 47 M62 65L78 61"],
  moon: ["M62 10A40 40 0 1 0 90 66A37 37 0 0 1 62 10Z", "M79 10V26 M71 18H87"],
  group: ["M50 12A10 10 0 1 0 50 32A10 10 0 1 0 50 12 M20 27A8 8 0 1 0 20 43A8 8 0 1 0 20 27 M80 27A8 8 0 1 0 80 43A8 8 0 1 0 80 27", "M33 78V52Q50 34 67 52V78Z M7 79V59Q16 46 29 54 M71 54Q84 46 93 59V79 M42 78V92 M58 78V92 M17 65V89 M83 65V89"],
  home: ["M7 45L50 10L93 45 M18 38V89H82V38 M39 89V59H61V89 M27 47H35V55H27Z M65 47H73V55H65Z"],
};
export function RoutineIconDrawing({ icon }: { icon: RoutineIcon }) { return <svg viewBox="0 0 100 100" role="img" aria-label={routineIconLabels[icon]} fill="none" stroke={routineIconColors[icon]} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">{routineIconPaths[icon].map((path, i) => <path d={path} key={i} />)}</svg>; }
