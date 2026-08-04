import { Engine } from "@oncyberio/engine";
import { useEffect, useRef } from "react";

export function GameCanvas() {
  //
  const sceneContainer = useRef<HTMLDivElement>(null);
  const canvasContainer = useRef<HTMLDivElement>(null);

  const wasInit = useRef(false);

  useEffect(() => {
    if (!canvasContainer.current || wasInit.current) return;

    wasInit.current = true;

    const resize = () => {
      console.log("game canvas resize", canvasContainer.current.clientWidth, canvasContainer.current.clientHeight);
      engine.resize({
        w: canvasContainer.current.clientWidth,
        h: canvasContainer.current.clientHeight
      });
    };

    window.addEventListener("resize", resize);

    const engine = Engine.getInstance();
    canvasContainer.current.textContent = "";
    engine.ready.then(() => {
      if (!canvasContainer.current) return;
      canvasContainer.current.appendChild(engine.canvas);

      setTimeout(() => {
        resize();
      }, 0);
    });

    return () => {
      window.removeEventListener("resize", resize);
      wasInit.current = false;
      engine.canvas.parentElement?.removeChild(engine.canvas);
    };
  }, [canvasContainer.current]);

  return (
    <div className="w-full h-full bg-black" ref={sceneContainer} id="exhibit">
      <div
        id="canvas-container"
        className="outline-none w-full h-full absolute left-0 top-0 pointer-events-auto"
        ref={canvasContainer}
      />
      <div id="oo-ui-root" className="absolute top-0 left-0 pointer-events-auto" />
      <div id="jump-button" className="rounded-full cursor-pointer w-14 h-14 min-w-14 min-h-14 items-center justify-center transition-all duration-500 outline-none select-none fixed bottom-[115px] right-[25px] z-[var(--zIndex-joystick)] pointer-events-auto hidden border border-white/25 bg-white/20 shadow-[0_0_12px_rgba(32,32,32,0.1)]">
        <svg
          width="26"
          height="30"
          viewBox="0 0 26 30"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M24.482 12.8712L20.2857 7.96243L14.7906 1.75134C13.8914 0.749553 12.1929 0.749553 11.3936 1.75134L5.7985 7.96243L1.50229 12.771C0.303348 14.0733 1.40238 16.0769 3.20079 16.0769H6.69858V27.0966C6.69858 28.0984 7.59779 29 8.69682 29H16.688C17.787 29 18.6862 28.1986 18.6862 27.0966V16.0769H22.6836C24.6818 16.1771 25.6809 14.1735 24.482 12.8712Z"
            fill="white"
            stroke="#202020"
            strokeWidth="1.5"
            strokeMiterlimit="10"
          />
        </svg>
      </div>
    </div>
  );
}
