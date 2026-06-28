import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

export interface SignatureCanvasRef {
  clear: () => void;
  toDataURL: () => string | null;
  isEmpty: () => boolean;
}

interface Props {
  height?: number;
  onDrawEnd?: (dataUrl: string | null) => void; // Callback nach jedem Strich-Ende
  onClear?: () => void;                          // Callback nach clear()
}

const SignatureCanvas = forwardRef<SignatureCanvasRef, Props>(
  ({ height = 140, onDrawEnd, onClear }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const hasDrawn = useRef(false);

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasDrawn.current = false;
        onClear?.();
      },
      toDataURL: () => {
        if (!hasDrawn.current) return null;
        return canvasRef.current?.toDataURL("image/png") ?? null;
      },
      isEmpty: () => !hasDrawn.current,
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
          ctx.strokeStyle = "#1a1a1a";
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
        }
      };
      resizeCanvas();

      const getPos = (e: MouseEvent | Touch, rect: DOMRect) => ({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });

      const fireDrawEnd = () => {
        drawing.current = false;
        if (hasDrawn.current && onDrawEnd) {
          onDrawEnd(canvas.toDataURL("image/png"));
        }
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
    }, [height, onDrawEnd, onClear]);

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
