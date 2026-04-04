export type SceneConfig = {
  id: string;
  label: string;
  url: string;
  transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };
  light: {
    position: [number, number, number];
    rotation: [number, number, number];
    color: [number, number, number];
    intensity: number;
    shadowDistance: number;
    shadowResolution: number;
    shadowBias: number;
    normalOffsetBias: number;
    debugScale?: [number, number, number];
  };
};
export const SCENES: SceneConfig[] = [
  {
    id: 'None',
    label: 'None',
    url: 'marble/',
    transform: {
      position: [0, -0.1, 3],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    light: {
      position: [0, 0.8, -1.5],
      rotation: [-60, 0, 0],
      color: [1, 0.95, 0.9],
      intensity: 1,
      shadowDistance: 80,
      shadowResolution: 2048,
      shadowBias: 0.05,
      normalOffsetBias: 0.05,
      debugScale: [0.2, 0.2, 0.2],
    },
  },
  {
    id: 'world',
    label: 'World',
    url: 'marble/world.compressed.ply',
    transform: {
      position: [0, -0.1, 3],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    light: {
      position: [0, 0.8, -1.5],
      rotation: [-60, 0, 0],
      color: [1, 0.95, 0.9],
      intensity: 1,
      shadowDistance: 80,
      shadowResolution: 2048,
      shadowBias: 0.05,
      normalOffsetBias: 0.05,
      debugScale: [0.2, 0.2, 0.2],
    },
  },
  {
    id: 'historic-european-cobblestone-street',
    label: 'Historic European Cobblestone Street',
    url: 'marble/Historic European Cobblestone Street.compressed.ply',
    transform: {
      position: [0, -1.2, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    light: {
      position: [0, 0.8, -1.5],
      rotation: [-60, 0, 0],
      color: [1, 0.95, 0.9],
      intensity: 1,
      shadowDistance: 80,
      shadowResolution: 2048,
      shadowBias: 0.05,
      normalOffsetBias: 0.05,
      debugScale: [0.2, 0.2, 0.2],
    },
  },
  {
    id: 'industrial-room-with-discarded-materials',
    label: 'Industrial Room with Discarded Materials',
    url: 'marble/Industrial Room with Discarded Materials.compressed.ply',
    transform: {
      position: [0, -1.25, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    light: {
      position: [0, 0.8, -1.5],
      rotation: [-60, 0, 0],
      color: [1, 0.95, 0.9],
      intensity: 1,
      shadowDistance: 80,
      shadowResolution: 2048,
      shadowBias: 0.05,
      normalOffsetBias: 0.05,
      debugScale: [0.2, 0.2, 0.2],
    },
  },
  {
    id: 'modern-cafe-interior-with-displays',
    label: 'Modern cafe interior with displays',
    url: 'marble/Modern cafe interior with displays.compressed.ply',
    transform: {
      position: [0, -1.2, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    light: {
      position: [0, 0.8, -1.5],
      rotation: [-60, 0, 0],
      color: [1, 0.95, 0.9],
      intensity: 1,
      shadowDistance: 80,
      shadowResolution: 2048,
      shadowBias: 0.05,
      normalOffsetBias: 0.05,
      debugScale: [0.2, 0.2, 0.2],
    },
  },
  {
    id: 'roomflow-luxury',
    label: 'RoomFlow - luxury',
    url: 'marble/RoomFlow - luxury.compressed.ply',
    transform: {
      position: [0, -1.25, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    light: {
      position: [0, 0.8, -1.5],
      rotation: [-60, 0, 0],
      color: [1, 0.95, 0.9],
      intensity: 1,
      shadowDistance: 80,
      shadowResolution: 2048,
      shadowBias: 0.05,
      normalOffsetBias: 0.05,
      debugScale: [0.2, 0.2, 0.2],
    },
  },
  {
    id: 'serene-residential-bedroom-interior',
    label: 'Serene Residential Bedroom Interior',
    url: 'marble/Serene Residential Bedroom Interior.compressed.ply',
    transform: {
      position: [0, -1.2, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    light: {
      position: [0, 0.8, -1.5],
      rotation: [-60, 0, 0],
      color: [1, 0.95, 0.9],
      intensity: 1,
      shadowDistance: 80,
      shadowResolution: 2048,
      shadowBias: 0.05,
      normalOffsetBias: 0.05,
      debugScale: [0.2, 0.2, 0.2],
    },
  },
];