import { useEffect} from 'react';
import { useApp } from '@playcanvas/react/hooks';
import * as pc from 'playcanvas';
const SKY_PRESETS = {
  None: { url: null as string | null },

  'Street Dome': {
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/wide_street_02_2k.hdr',
    type: pc.SKYTYPE_DOME,
    scale: [200, 200, 200] as [number, number, number],
    tripodY: 0.05,
    exposure: 0.7,
    rotation: 0,
  },

  Sunset: {
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/industrial_sunset_puresky_2k.hdr',
    type: pc.SKYTYPE_INFINITE,
    scale: [200, 200, 200] as [number, number, number],
    tripodY: 0.05,
    exposure: 0.3,
    rotation: 90,
  },

  'Rosendal Sunset': {
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/rosendal_park_sunset_puresky_2k.hdr',
    type: pc.SKYTYPE_INFINITE,
    exposure: 0.3,
    rotation: 0,
  },

  Night: {
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/solitude_night_2k.hdr',
    type: pc.SKYTYPE_DOME,
    scale: [200, 200, 200] as [number, number, number],
    tripodY: 0.05,
    exposure: 0.5,
    rotation: 0,
  },

  Sunrise: {
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/stierberg_sunrise_2k.hdr',
    type: pc.SKYTYPE_DOME,
    scale: [200, 200, 200] as [number, number, number],
    tripodY: 0.05,
    exposure: 0.5,
    rotation: -80,
  },
};

export function SceneSkybox({ presetName = 'Street Dome' }: { presetName?: keyof typeof SKY_PRESETS }) {
  const app = useApp();

  useEffect(() => {
    if (!app) return;

    const preset = SKY_PRESETS[presetName];
    if (!preset || !preset.url) {
      app.scene.skybox = null;
      app.scene.envAtlas = null;
      return;
    }

    const layers = app.scene.layers;
    const skyboxLayer = layers.getLayerByName('Skybox');
    if (skyboxLayer) {
      layers.remove(skyboxLayer);
      layers.insert(skyboxLayer, 0);
    }

    const asset = new pc.Asset(
      `hdri-${presetName}`,
      'texture',
      { url: preset.url },
      { mipmaps: false }
    );

    const onLoad = () => {
      const texture = asset.resource as pc.Texture;

      const skybox = pc.EnvLighting.generateSkyboxCubemap(texture);
      const lighting = pc.EnvLighting.generateLightingSource(texture);
      const envAtlas = pc.EnvLighting.generateAtlas(lighting);
      lighting.destroy();

      app.scene.sky.type = preset.type ?? pc.SKYTYPE_INFINITE;
      app.scene.skybox = skybox;
      app.scene.envAtlas = envAtlas;
      app.scene.skyboxRotation = new pc.Quat().setFromEulerAngles(0, preset.rotation ?? 0, 0);
      app.scene.exposure = preset.exposure ?? 1;
      app.scene.sky.center = new pc.Vec3(0, preset.tripodY ?? 0, 0);
      app.scene.sky.node.setLocalScale(new pc.Vec3(...(preset.scale ?? [1, 1, 1])));
    };

    asset.on('load', onLoad);
    app.assets.add(asset);
    app.assets.load(asset);

    return () => {
      asset.off('load', onLoad);
      if (app.assets.get(asset.id)) {
        app.assets.remove(asset);
      }
    };
  }, [app, presetName]);

  return null;
}