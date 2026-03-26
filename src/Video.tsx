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
  autoPlay = true,
}: {
  src: string;
  frameStart: number;
  frameLength: number;
  fps?: number;
  autoPlay?: boolean;
}) {
  const [frameCurrent, setFrameCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [frameLoaded, setFrameLoaded] = useState(0);
  const onLoadFrame = (count: number) => {
    setFrameLoaded(count);
  };

  const animationFrameId = useRef(0);
  const lastTime = useRef(0);
  const fpsInterval = 1000 / fps;

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

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
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

        <Entity position={[0, 0.5, 0]} rotation={[0, 140, 0]}>
          <Entity position={[0.432, 0, -0.22]} scale={[1, 1, 1]} rotation={[0, 270, 0]}>
            <AnimGSplat
              src={src}
              frameStart={frameStart}
              frameLength={frameLength}
              frameCurrent={frameCurrent}
              onLoadFrame={onLoadFrame}
            />
          </Entity>
        </Entity>
      </Application>
      <div className="top-overlay">
        <p>
          Current Frame: {frameCurrent} | Frames Loaded: {frameLoaded}/{frameLength} | FPS: {fps}
        </p>
        <button onClick={handleTogglePlay} type={'button'}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
    </>
  );
}

export default function Video({ src, frameLength, fps }: { src: string; frameLength: number; fps?: number }) {
  return <VolumetricVideo src={src} frameStart={1} frameLength={frameLength} fps={fps} />;
}