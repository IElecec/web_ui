export type GaussianVideoConfig = {
  id: string;
  name: string;
  frameNumber: number;
  frameStart: number;
  assetPath: string;
};

export const GaussianVideoConfig: Record<string, GaussianVideoConfig> = {
  none: {
    id: 'none',
    name: 'None',
    frameNumber: 1,
    frameStart: 0,
    assetPath: 'none',
  },
  coser21: {
    id: 'coser21',
    name: 'Coser 21',
    frameNumber: 50,
    frameStart: 40,
    assetPath: '0517_coser21_0',
  },
  dancer2: {
    id: 'dancer2',
    name: 'Dancer 2',
    frameNumber: 60,
    frameStart: 101,
    assetPath: '0517_dancer2_0',
  },
  hu_flute2: {
    id: 'hu_flute2',
    name: 'Hu Flute 2',
    frameNumber: 50,
    frameStart: 501,
    assetPath: '0509_hu_flute2_1',
  },
};