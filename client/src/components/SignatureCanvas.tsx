import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

export interface SignatureCanvasRef {
  clear: () => void;
  toDataURL: () => string | null;
  isEmpty: () => boolean;
}

interface Props {
  height?: number;
  value?: string | null;
  onDrawEnd?: (dataUrl: string | null) => void;
  onClear?: () => void;
}

const SignatureCanvas = forwardRef<SignatureCanvasRef, Props>(
  ({ height = 140, value, onDrawEnd, onClear }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const hasDrawn = useRef(false);
    const latestValueRef = useRef<string | null>(value ?? null);
    const onDrawEndRef = useRef<Props["onDrawEnd"]>(onDrawEnd);
    const onClearRef = useRef<Props["onClear"]>(onClear);

    useEffect(() => {
      onDrawEndRef.current = onDrawEnd;
    }, [onDrawEnd]);

    useEffect(() => {
      onClearRef.current = onClear;
    }, [onClear]);

    const configureContext = () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      return ctx;
    };

    const clearCanvasInternal = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      configureContext();
    };

    const restoreSignature = (dataUrl: string | null | undefined) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      clearCanvasInternal();

      if (!dataUrl) {
        hasDrawn.current = false;
        latestValueRef.current = null;
        return;
      }

      const img = new Image();
      img.onload = () => {
        const ctx = configureContext();
        if (!ctx) return;
        const displayWidth = canvas.width / window.devicePixelRatio;
        const displayHeight = canvas.height / window.devicePixelRatio;
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        hasDrawn.current = true;
      };
      img.src = dataUrl;
      latestValueRef.current = dataUrl;
    };

    useImperativeHandle(ref, () => ({
      clear: () => {
        latestValueRef.current = null;
        hasDrawn.current = false;
        clearCanvasInternal();
        onClearRef.current?.();
      },
      toDataURL: () => {
        if (!hasDrawn.current) return latestValueRef.current;
        return canvasRef.current?.toDataURL("image/png") ?? latestValueRef.current;
      },
      isEmpty: () => !hasDrawn.current && !latestValueRef.current,
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, rect.width * window.devicePixelRatio);
        canvas.height = Math.max(1, height * window.devicePixelRatio);
        configureContext();
        if (latestValueRef.current) {
          restoreSignature(latestValueRef.current);
        }
      };
      resizeCanvas();

      const getPos = (e: MouseEvent | Touch, rect: DOMRect) => ({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });

      const fireDrawEnd = () => {
        drawing.current = false;
        if (!hasDrawn.current) return;
        const url = canvas.toDataURL("image/png");
        latestValueRef.current = url;
        onDrawEndRef.current?.(url);
      };

      const onMouseDown = (e: MouseEvent) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        drawing.current = true;
        const rect = canvas.getBoundingClientRect();
        const pos = getPos(e, rect);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      };
      const onMouseMove = (e: MouseEvent) => {
        if (!drawing.current) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const pos = getPos(e, rect);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        hasDrawn.current = true;
      };
      const onMouseUp = () => fireDrawEnd();

      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        drawing.current = true;
        const rect = canvas.getBoundingClientRect();
        const t = e.touches[0];
        const pos = getPos(t, rect);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      };
      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (!drawing.current) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const t = e.touches[0];
        const pos = getPos(t, rect);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        hasDrawn.current = true;
      };
      const onTouchEnd = () => fireDrawEnd();

      canvas.addEventListener("mousedown", onMouseDown);
      canvas.addEventListener("mousemove", onMouseMove);
      canvas.addEventListener("mouseup", onMouseUp);
      canvas.addEventListener("mouseleave", onMouseUp);
      canvas.addEventListener("touchstart", onTouchStart, { passive: false });
      canvas.addEventListener("touchmove", onTouchMove, { passive: false });
      canvas.addEventListener("touchend", onTouchEnd);

      return () => {
        canvas.removeEventListener("mousedown", onMouseDown);
        canvas.removeEventListener("mousemove", onMouseMove);
        canvas.removeEventListener("mouseup", onMouseUp);
        canvas.removeEventListener("mouseleave", onMouseUp);
        canvas.removeEventListener("touchstart", onTouchStart);
        canvas.removeEventListener("touchmove", onTouchMove);
        canvas.removeEventListener("touchend", onTouchEnd);
      };
    }, [height]);

    useEffect(() => {
      latestValueRef.current = value ?? null;
      restoreSignature(value ?? null);
    }, [value]);

    return (
      <canvas
        ref={canvasRef}
        className="sig-canvas"
        style={{ height: `${height}px`, display: "block", width: "100%" }}
      />
    );
  }
);

SignatureCanvas.displayName = "SignatureCanvas";
export default SignatureCanvas;
