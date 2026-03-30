import './App.css';
import './AnimGSplat.tsx';
import { Application, Entity } from '@playcanvas/react';
import { Camera } from '@playcanvas/react/components';
import { OrbitControls } from '@playcanvas/react/scripts';
import React, { useState, useEffect, useRef } from 'react';
import { AnimGSplat } from './AnimGSplat.tsx';

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
        <Entity name="camera" position={[0, 0.5, 0]} rotation={[0, 0, 0]}>
          <Camera />
          <OrbitControls
            distance={5}
            distanceMax={5}
            distanceMin={0.3}
            pitchAngleMin={-90}
            pitchAngleMax={90}
            frameOnStart={true}
          />
        </Entity>

        <Entity position={[0, 0, 0]} rotation={[0, 0, 0]}>
          <Entity position={[-0.22, 1, -0.22]} scale={[1, 1, 1]} rotation={[180, 0, 0]}>
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
        <p>
          Current Frame: {frameCurrent} | Frames Loaded: {frameLoaded}/{frameLength} | FPS: {fps}
        </p>

        <button onClick={handleTogglePlay} type="button">
          {isPlaying ? 'Pause' : 'Play'}
        </button>

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