// interpolate.ts
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';

// ---- Stub GaussianModel ----
class GaussianModel {
  xyz: number[][] = [];
  features_dc: number[][] = [];
  rotation: number[] = [0, 0, 0, 1]; // 四元数 [x, y, z, w]

  constructor(public shDegree: number) {}

  loadPLY(filePath: string) {
    console.log(`加载 PLY 文件: ${filePath}`);
    // TODO: 读取 PLY 并填充 xyz / features / rotation
  }

  savePLY(filePath: string) {
    console.log(`保存 PLY 文件: ${filePath}`);
    // TODO: 写 PLY 文件
  }
}

// ---- Slerp 四元数插值 ----
function slerpQuaternions(low: number[], high: number[], alpha: number): number[] {
  // TODO: 这里可以用 Three.js 的 THREE.Quaternion.slerp
  // 先用线性插值占位
  return low.map((v, i) => (1 - alpha) * v + alpha * high[i]);
}

// ---- 插值逻辑 ----
function interpolateAndSave(
  pathA: string,
  pathB: string,
  outputDir: string,
  startNum: number,
  numInterp: number,
  shDegree: number
) {
  const modelA = new GaussianModel(shDegree);
  const modelB = new GaussianModel(shDegree);
  modelA.loadPLY(pathA);
  modelB.loadPLY(pathB);

  for (let i = 1; i <= numInterp; i++) {
    const alpha = i / (numInterp + 1);
    const currIdx = startNum + i;
    const interpModel = new GaussianModel(shDegree);

    // ---- 插值占位 ----
    interpModel.xyz = []; // TODO: 插值 xyz
    interpModel.features_dc = []; // TODO: 插值 features
    interpModel.rotation = slerpQuaternions(modelA.rotation, modelB.rotation, alpha);

    const savePath = path.join(outputDir, `frame_${currIdx.toString().padStart(4, '0')}.ply`);
    interpModel.savePLY(savePath);
  }
}

// ---- 主函数 ----
function main() {
  const argv = yargs(process.argv.slice(2))
    .option('input', { type: 'string', demandOption: true })
    .option('output', { type: 'string', demandOption: true })
    .option('start', { type: 'number', default: 80 })
    .option('end', { type: 'number', default: 160 })
    .option('step', { type: 'number', default: 5 })
    .option('num', { type: 'number', default: 5 })
    .option('sh', { type: 'number', default: 3 })
    .argv;

  const inputDir = argv.input;
  const outputDir = argv.output;
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  let globalPtr = 1;

  for (let fIdx = argv.start; fIdx < argv.end; fIdx += argv.step) {
    const pathA = path.join(inputDir, `frame_${fIdx.toString().padStart(4, '0')}.ply`);
    const pathB = path.join(inputDir, `frame_${(fIdx + argv.step).toString().padStart(4, '0')}.ply`);

    if (!fs.existsSync(pathA) || !fs.existsSync(pathB)) {
      console.log(`文件缺失，跳过间隔: ${fIdx} -> ${fIdx + argv.step}`);
      continue;
    }

    // 复制起始帧
    fs.copyFileSync(pathA, path.join(outputDir, `frame_${globalPtr.toString().padStart(4, '0')}.ply`));

    // 插值帧
    interpolateAndSave(pathA, pathB, outputDir, globalPtr, argv.num, argv.sh);

    globalPtr += argv.num + 1;
  }

  // 复制最后一帧
  const lastPath = path.join(inputDir, `frame_${argv.end.toString().padStart(4, '0')}.ply`);
  if (fs.existsSync(lastPath)) {
    fs.copyFileSync(lastPath, path.join(outputDir, `frame_${globalPtr.toString().padStart(4, '0')}.ply`));
  }

  console.log(`[完成] 序列已保存至: ${outputDir}`);
}

main();