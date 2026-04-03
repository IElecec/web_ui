import './App.css';
import './AnimGSplat.tsx';
import { Application, Entity } from '@playcanvas/react';
import { Camera, Light, Render} from '@playcanvas/react/components';
import { OrbitControls } from '@playcanvas/react/scripts';
import React, { useState, useEffect, useRef } from 'react';
import { AnimGSplat } from './AnimGSplat.tsx';
import { SceneSkybox } from './Skybox.tsx';
import { ShadowCatcherPlane } from './ShadowCatcher';

function VolumetricVideo({
  src,
  frameStart,
  frameLength,
  fps = 30,
  interpolated = false,
  keyFrameA = 5,
  keyFrameB = 15,
  autoPlay = true,
}: {
  src: string;
  frameStart: number;
  frameLength: number;
  fps?: number;
  interpolated?: boolean;
  keyFrameA?: number;
  keyFrameB?: number;
  autoPlay?: boolean;
}) {
  const [frameCurrent, setFrameCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [frameLoaded, setFrameLoaded] = useState(0);
  const [frameInput, setFrameInput] = useState('0');

  const onLoadFrame = (count: number) => {
    setFrameLoaded(count);
  };

  const animationFrameId = useRef(0);
  const lastTime = useRef(0);
  const fpsInterval = 1000 / fps;

  const clampFrame = (value: number) => {
    if (Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(frameLength - 1, value));
  };

  useEffect(() => {
    if (isPlaying) {
      const animate = (timestamp: number) => {
        const deltaTime = timestamp - lastTime.current;
        if (deltaTime > fpsInterval) {
          lastTime.current = timestamp - (deltaTime % fpsInterval);
          setFrameCurrent((prevFrame) => (prevFrame + 1) % frameLength);
        }

        animationFrameId.current = requestAnimationFrame(animate);
      };

      lastTime.current = performance.now();
      animationFrameId.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying, frameLength, fpsInterval]);

  useEffect(() => {
    setFrameInput(String(frameCurrent));
  }, [frameCurrent]);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = clampFrame(Number(e.target.value));
    setFrameCurrent(value);
    setFrameInput(String(value));
  };

  const handleFrameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFrameInput(e.target.value);
  };

  const handleGotoFrame = () => {
    const parsed = parseInt(frameInput, 10);
    const safeFrame = clampFrame(parsed);
    setFrameCurrent(safeFrame);
    setFrameInput(String(safeFrame));
  };

  return (
    <>
      <Application className="fullscreen">
        <Entity name="camera" position={[0, 1, 0]} rotation={[0, 0, 0]}>
          <SceneSkybox/>
          <Camera />
          <OrbitControls
            distance={50}
            distanceMax={50}
            distanceMin={0.3}
            pitchAngleMin={-90}
            pitchAngleMax={90}
            frameOnStart={true}
          />
        </Entity>

        {/* light */}
        <Entity
          name="sun"
          rotation={[45, 30, 0]}
        >
          <Light
            type="directional"
            color={[1, 1, 1]}
            intensity={1.2}
            castShadows={true}
            shadowDistance={80}
            shadowResolution={2048}
            shadowBias={0.2}
            normalOffsetBias={0.05}
          />
        </Entity>
        {/* ground */}
        {/* <Entity
          name="ground"
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          scale={[40, 40, 40]}
        >
          <Render
            type="plane"
            castShadows={false}
            receiveShadows={true}
          />
        </Entity> */}
        {/* cube */}
        {/* <Entity position={[0, 5, 0]} scale={[2, 2, 2]}>
          <Render type="box" castShadows={true} receiveShadows={true} />
        </Entity> */}
        {/* Shadow Catcher Plane */}
        <Entity name="shadow-catcher" position={[0, 0, 0]}>
          <ShadowCatcherPlane scale={[100, 100, 100]} y={0} enabled={true} />
        </Entity>

        <Entity position={[0, 0, 0]} rotation={[0, 0, 0]}>
          <Entity position={[0, 12, 0]} scale={[8, 8, 8]} rotation={[165, 0, 0]}>
            {/* <AnimGSplatOfficial
              src={src}
              frameStart={frameStart}
              frameCurrent={frameCurrent}
            /> */}
            <AnimGSplat
              src={src}
              frameStart={frameStart}
              frameLength={frameLength}
              frameCurrent={frameCurrent}
              interpolate={interpolated}
              keyFrameA={keyFrameA}
              keyFrameB={keyFrameB}
              onLoadFrame={onLoadFrame}
            />
          </Entity>
        </Entity>
      </Application>

      <div className="top-overlay">
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: '#fff',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minWidth: 260,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.5,
              fontFamily: 'system-ui, sans-serif',
              textShadow: '0 1px 2px rgba(0,0,0,0.45)',
            }}
          >
            Current Frame: {frameCurrent} |
            Frames Loaded: {frameLoaded}/{frameLength} |
            FPS: {fps}
          </p>

          <button
            onClick={handleTogglePlay}
            type="button"
            style={{
              appearance: 'none',
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>

        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 24,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: 'min(900px, 90vw)',
              padding: '0 16px',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <input
              type="range"
              min={0}
              max={frameLength - 1}
              step={1}
              value={frameCurrent}
              onChange={handleSliderChange}
              disabled={isPlaying}
              style={{
                flex: 1,
              }}
            />

            <input
              type="number"
              min={0}
              max={frameLength - 1}
              step={1}
              value={frameInput}
              onChange={handleFrameInputChange}
              disabled={isPlaying}
              style={{
                width: 100,
              }}
            />

            <button
              type="button"
              onClick={handleGotoFrame}
              disabled={isPlaying}
            >
              Go To
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Video({
  src,
  frameStart,
  frameLength,
  fps,
  interpolated,
  keyFrameA,
  keyFrameB,
}: {
  src: string;
  frameStart: number;
  frameLength: number;
  fps?: number;
  keyFrameA?: number;
  keyFrameB?: number;
  interpolated?: boolean;
}) {
  return <VolumetricVideo src={src} frameStart={frameStart} frameLength={frameLength} fps={fps} interpolated={interpolated} keyFrameA={keyFrameA} keyFrameB={keyFrameB} />;
}