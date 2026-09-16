import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  CheckIcon,
  DownloadIcon,
  ResetIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

import {
  ACTIVITY_STUDIO_DRAWING_COLORS,
  buildDrawingPadDownloadName,
  calculateDrawingPadCanvasMetrics,
  normalizeDrawingPadPoint,
  type ActivityDrawingPadEvidence,
  type ActivityStudioDrawingPadMode,
  type DrawingPadCanvasMetrics,
  type DrawingPadPoint,
} from "./drawing-pad-model.ts";
import {
  escapePrintHtml,
  openHtmlPrintWindow,
} from "../printing/open-html-print-window.ts";

interface DrawingStroke {
  readonly color: string;
  readonly points: readonly DrawingPadPoint[];
}

interface ActiveDrawingStroke {
  readonly pointerId: number;
  readonly color: string;
  readonly points: DrawingPadPoint[];
}

type KeyboardDrawingShape = "dot" | "line" | "circle";

export interface ActivityDrawingPadProps {
  readonly activityTitle: string;
  readonly mode: ActivityStudioDrawingPadMode;
  readonly onEvidenceChange?: (evidence: ActivityDrawingPadEvidence) => void;
}

const DEFAULT_METRICS: DrawingPadCanvasMetrics = Object.freeze({
  cssWidth: 640,
  cssHeight: 480,
  pixelRatio: 1,
  backingWidth: 640,
  backingHeight: 480,
});

function drawStroke(
  context: CanvasRenderingContext2D,
  stroke: DrawingStroke,
  width: number,
  height: number,
): void {
  const firstPoint = stroke.points[0];
  if (!firstPoint) return;

  context.save();
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (stroke.points.length === 1) {
    const radius = 3.5 + firstPoint.pressure * 2.5;
    context.beginPath();
    context.arc(firstPoint.x * width, firstPoint.y * height, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }

  context.beginPath();
  context.moveTo(firstPoint.x * width, firstPoint.y * height);
  for (const point of stroke.points.slice(1)) {
    context.lineWidth = 5 + point.pressure * 4;
    context.lineTo(point.x * width, point.y * height);
  }
  context.stroke();
  context.restore();
}

export function ActivityDrawingPad({
  activityTitle,
  mode,
  onEvidenceChange,
}: ActivityDrawingPadProps) {
  const componentId = useId();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<DrawingStroke[]>([]);
  const activeStrokeRef = useRef<ActiveDrawingStroke | null>(null);
  const metricsRef = useRef<DrawingPadCanvasMetrics>(DEFAULT_METRICS);
  const [selectedColorId, setSelectedColorId] = useState(
    ACTIVITY_STUDIO_DRAWING_COLORS[0]?.id ?? "lacivert",
  );
  const [strokeCount, setStrokeCount] = useState(0);
  const [downloadedFileName, setDownloadedFileName] = useState<string | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState(
    "Bir renk seçip parmağınla çizmeye başlayabilirsin.",
  );

  const selectedColor =
    ACTIVITY_STUDIO_DRAWING_COLORS.find(
      (color) => color.id === selectedColorId,
    ) ?? ACTIVITY_STUDIO_DRAWING_COLORS[0];

  useEffect(() => {
    onEvidenceChange?.({ mode, strokeCount, downloadedFileName });
  }, [downloadedFileName, mode, onEvidenceChange, strokeCount]);

  const renderBoard = useCallback(
    (extraStroke?: DrawingStroke) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      const metrics = metricsRef.current;

      context.setTransform(
        metrics.pixelRatio,
        0,
        0,
        metrics.pixelRatio,
        0,
        0,
      );
      context.clearRect(0, 0, metrics.cssWidth, metrics.cssHeight);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, metrics.cssWidth, metrics.cssHeight);

      for (const stroke of strokesRef.current) {
        drawStroke(context, stroke, metrics.cssWidth, metrics.cssHeight);
      }
      if (extraStroke) {
        drawStroke(context, extraStroke, metrics.cssWidth, metrics.cssHeight);
      }
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const metrics = calculateDrawingPadCanvasMetrics(
        rect.width,
        rect.height,
        window.devicePixelRatio,
      );
      metricsRef.current = metrics;
      if (
        canvas.width !== metrics.backingWidth ||
        canvas.height !== metrics.backingHeight
      ) {
        canvas.width = metrics.backingWidth;
        canvas.height = metrics.backingHeight;
      }
      const activeStroke = activeStrokeRef.current;
      renderBoard(activeStroke ?? undefined);
    };

    resizeCanvas();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [renderBoard]);

  const pointFromPointer = (
    pointer: Pick<PointerEvent, "clientX" | "clientY" | "pressure">,
  ): DrawingPadPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return Object.freeze({ x: 0, y: 0, pressure: 0.5 });
    const rect = canvas.getBoundingClientRect();
    return normalizeDrawingPadPoint(
      pointer.clientX,
      pointer.clientY,
      pointer.pressure,
      rect,
    );
  };

  const finishStroke = (pointerId: number) => {
    const activeStroke = activeStrokeRef.current;
    if (!activeStroke || activeStroke.pointerId !== pointerId) return;
    const finishedStroke: DrawingStroke = Object.freeze({
      color: activeStroke.color,
      points: Object.freeze([...activeStroke.points]),
    });
    strokesRef.current = [...strokesRef.current, finishedStroke];
    activeStrokeRef.current = null;
    setStrokeCount(strokesRef.current.length);
    setDownloadedFileName(null);
    setStatusMessage("Çizgin eklendi. İstersen başka bir renkle devam et.");
    renderBoard();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || event.button !== 0 || !selectedColor) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Bazı gömülü tarayıcılar yakalamayı desteklemese de çizim devam eder.
    }
    const point = pointFromPointer(event.nativeEvent);
    const activeStroke: ActiveDrawingStroke = {
      pointerId: event.pointerId,
      color: selectedColor.value,
      points: [point],
    };
    activeStrokeRef.current = activeStroke;
    renderBoard(activeStroke);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const activeStroke = activeStrokeRef.current;
    if (!activeStroke || activeStroke.pointerId !== event.pointerId) return;
    event.preventDefault();
    const previousPointCount = activeStroke.points.length;
    const nativeEvent = event.nativeEvent;
    const pointerEvents = nativeEvent.getCoalescedEvents?.() ?? [nativeEvent];
    for (const pointerEvent of pointerEvents) {
      activeStroke.points.push(pointFromPointer(pointerEvent));
    }
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;
    const metrics = metricsRef.current;
    const segmentStart = Math.max(0, previousPointCount - 1);
    drawStroke(
      context,
      {
        color: activeStroke.color,
        points: activeStroke.points.slice(segmentStart),
      },
      metrics.cssWidth,
      metrics.cssHeight,
    );
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    finishStroke(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const undoLastStroke = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    setDownloadedFileName(null);
    setStatusMessage("Son çizgi geri alındı.");
    renderBoard();
  };

  const clearBoard = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = [];
    setStrokeCount(0);
    setDownloadedFileName(null);
    setStatusMessage("Çizim alanı temizlendi. Yeniden başlayabilirsin.");
    renderBoard();
  };

  const addKeyboardShape = (shape: KeyboardDrawingShape) => {
    if (!selectedColor) return;
    const points: DrawingPadPoint[] =
      shape === "dot"
        ? [{ x: 0.5, y: 0.5, pressure: 0.5 }]
        : shape === "line"
          ? [
              { x: 0.25, y: 0.5, pressure: 0.5 },
              { x: 0.75, y: 0.5, pressure: 0.5 },
            ]
          : Array.from({ length: 25 }, (_, index) => {
              const angle = (index / 24) * Math.PI * 2;
              return {
                x: 0.5 + Math.cos(angle) * 0.22,
                y: 0.5 + Math.sin(angle) * 0.22,
                pressure: 0.5,
              };
            });
    const stroke: DrawingStroke = Object.freeze({
      color: selectedColor.value,
      points: Object.freeze(points),
    });
    strokesRef.current = [...strokesRef.current, stroke];
    setStrokeCount(strokesRef.current.length);
    setDownloadedFileName(null);
    const shapeLabel =
      shape === "dot" ? "Nokta" : shape === "line" ? "Çizgi" : "Daire";
    setStatusMessage(`${shapeLabel} çizime eklendi.`);
    renderBoard();
  };

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatusMessage("PNG hazırlanamadı. Bir kez daha deneyin.");
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = buildDrawingPadDownloadName(activityTitle);
      link.href = objectUrl;
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      setDownloadedFileName(link.download);
      setStatusMessage("Çizim PNG olarak bu cihaza indirildi.");
    }, "image/png");
  };

  const printDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const safeTitle = escapePrintHtml(activityTitle);
    const imageDataUrl = canvas.toDataURL("image/png");
    const result = openHtmlPrintWindow({
      title: `${activityTitle} · MaarifOS`,
      html: `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle} · MaarifOS</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #17324d; font-family: Arial, sans-serif; }
    h1 { margin: 0 0 12px; font-size: 24px; }
    p { margin: 0 0 16px; }
    img { display: block; width: 100%; max-width: 760px; border: 1px solid #dce4eb; }
  </style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <p>MaarifOS · Çocuk Modu · Puanlanmaz</p>
  <img src="${imageDataUrl}" alt="${safeTitle} çocuk çizimi">
</body>
</html>`,
    });
    if (!result.opened) {
      setStatusMessage(
        "Yazdırma penceresi açılamadı. PNG indir düğmesini kullanabilirsiniz.",
      );
      return;
    }
    setStatusMessage("Yazdırma görünümü açıldı.");
  };

  const canvasDescription =
    mode === "coloring"
      ? "Beyaz alanda renkleri karıştırıp kendi resmini boya."
      : "Boş alanda parmağınla veya kaleminle özgürce çiz.";

  return (
    <section
      className="activity-drawing-pad"
      aria-labelledby={`${componentId}-title`}
    >
      <header className="activity-drawing-pad__header">
        <div>
          <span>{mode === "coloring" ? "Boyama alanı" : "Çizim alanı"}</span>
          <h3 id={`${componentId}-title`}>Parmağınla çiz</h3>
        </div>
        <strong>Puan yok</strong>
      </header>

      <p className="activity-drawing-pad__hint">{canvasDescription}</p>

      <canvas
        ref={canvasRef}
        className="activity-drawing-pad__canvas"
        width={DEFAULT_METRICS.backingWidth}
        height={DEFAULT_METRICS.backingHeight}
        role="img"
        aria-label={`${activityTitle} için dokunmatik ${mode === "coloring" ? "boyama" : "çizim"} alanı. Klavye kullanıyorsanız aşağıdaki şekil düğmelerini kullanın.`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={(event) => finishStroke(event.pointerId)}
        onContextMenu={(event) => event.preventDefault()}
      >
        Tarayıcınız çizim alanını desteklemiyor.
      </canvas>

      <fieldset className="activity-drawing-pad__keyboard-tools">
        <legend>Klavye ile şekil ekle</legend>
        <p>Bir düğmeye Enter veya Boşluk ile bas.</p>
        <div>
          <button type="button" onClick={() => addKeyboardShape("dot")}>
            Nokta ekle
          </button>
          <button type="button" onClick={() => addKeyboardShape("line")}>
            Çizgi ekle
          </button>
          <button type="button" onClick={() => addKeyboardShape("circle")}>
            Daire ekle
          </button>
        </div>
      </fieldset>

      <fieldset className="activity-drawing-pad__palette">
        <legend>Renk seç</legend>
        <div>
          {ACTIVITY_STUDIO_DRAWING_COLORS.map((color) => {
            const selected = selectedColorId === color.id;
            return (
              <button
                type="button"
                key={color.id}
                aria-label={`${color.label} kalemi seç`}
                aria-pressed={selected}
                onClick={() => {
                  setSelectedColorId(color.id);
                  setStatusMessage(`${color.label} kalem seçildi.`);
                }}
              >
                <span
                  className="activity-drawing-pad__swatch"
                  style={{ backgroundColor: color.value }}
                  aria-hidden="true"
                />
                {selected ? <CheckIcon aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="activity-drawing-pad__toolbar" aria-label="Çizim araçları">
        <button type="button" disabled={strokeCount === 0} onClick={undoLastStroke}>
          <ResetIcon aria-hidden="true" />
          Geri al
        </button>
        <button type="button" disabled={strokeCount === 0} onClick={clearBoard}>
          <TrashIcon aria-hidden="true" />
          Temizle
        </button>
        <button
          type="button"
          className="activity-drawing-pad__download"
          onClick={downloadPng}
        >
          <DownloadIcon aria-hidden="true" />
          PNG indir
        </button>
        <button
          type="button"
          className="activity-drawing-pad__print"
          onClick={printDrawing}
        >
          Yazdır
        </button>
      </div>

      <p className="activity-drawing-pad__status" role="status" aria-live="polite">
        {statusMessage}
      </p>
    </section>
  );
}
