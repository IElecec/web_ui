import './App.css';
import './AnimGSplat.tsx';
import { Application, Entity } from '@playcanvas/react';
import { Camera, Light, Render} from '@playcanvas/react/components';
import { OrbitControls } from '@playcanvas/react/scripts';
import React, { useState, useEffect, useRef } from 'react';
import { AnimGSplat } from './AnimGSplat.tsx';
import { SceneSkybox } from './Skybox.tsx';
import { ShadowCatcherPlane } from './ShadowCatcher';
import { StaticGSplat } from './StaticGsplat.tsx';
import { useMemo} from 'react';
import { SCENES } from './sceneConfig';

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
  const [sceneId, setSceneId] = useState(SCENES[0].id);

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

  const currentScene = useMemo(() => {
    return SCENES.find((scene) => scene.id === sceneId) ?? SCENES[0];
  }, [sceneId]);

  return (
    <>
      <Application className="fullscreen">
        <Entity name="camera" position={[0, 1, 0]} rotation={[0, 0, 0]}>
          {/* <SceneSkybox/> */}
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

        {/* light */}
        <Entity
          name="light"
          position={currentScene.light.position}
          rotation={currentScene.light.rotation}
        >
          <Light
            type="directional"
            color={currentScene.light.color}
            intensity={currentScene.light.intensity}
            castShadows={true}
            shadowResolution={currentScene.light.shadowResolution}
            shadowBias={currentScene.light.shadowBias}
            normalOffsetBias={currentScene.light.normalOffsetBias}
            shadowDistance={currentScene.light.shadowDistance}
          />
        </Entity>
        {/* <Entity
          name="light-debug"
          position={currentScene.light.position}
          scale={currentScene.light.debugScale ?? [0.2, 0.2, 0.2]}
        >
          <Render
            type="sphere"
            castShadows={false}
            receiveShadows={false}
          />
        </Entity>
        <Entity
          name="light-debug-stem"
          position={[
            currentScene.light.position[0],
            currentScene.light.position[1],
            currentScene.light.position[2],
          ]}
          rotation={currentScene.light.rotation}
          scale={[0.03, 1, 0.03]}
        >
          <Render
            type="cylinder"
            castShadows={false}
            receiveShadows={false}
          />
        </Entity> */}
        {/* Shadow Catcher Plane */}
        <Entity name="shadow-catcher" position={[0, -1.2, 0]}>
          <ShadowCatcherPlane scale={[100, 100, 100]} y={0} enabled={true} />
        </Entity>
        <Entity
          position={currentScene.transform.position}
          rotation={currentScene.transform.rotation}
          scale={currentScene.transform.scale}
        >
        <StaticGSplat url={currentScene.url} />
        </Entity>
        <Entity position={[0, 0, 0]} rotation={[0, 0, 0]}>
          <Entity position={[0, 0, 0]} scale={[0.8, 0.8, 0.8]} rotation={[165, 0, 0]}>
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.45)',
                whiteSpace: 'nowrap',
              }}
            >
              Scene:
            </span>

            <select
              value={sceneId}
              onChange={(e) => setSceneId(e.target.value)}
              style={{
                appearance: 'none',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 13,
                lineHeight: 1.2,
                fontWeight: 500,
                cursor: 'pointer',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            >
              {SCENES.map((scene) => (
                <option
                  key={scene.id}
                  value={scene.id}
                  style={{ color: '#000' }}
                >
                  {scene.label}
                </option>
              ))}
            </select>
          </div>
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