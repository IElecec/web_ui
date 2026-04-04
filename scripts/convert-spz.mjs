import { readdir, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ROOT_DIR = path.resolve('public/marble');
const OUTPUT_EXT = '.compressed.ply';

async function walk(dir) {
  const entries = await readdir(dir);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry);
      const info = await stat(fullPath);
      if (info.isDirectory()) {
        return walk(fullPath);
      }
      return [fullPath];
    })
  );
  return files.flat();
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: true,
      stdio: 'inherit',
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function convertOne(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext !== '.spz') return false;

  const outputPath = inputPath.slice(0, -ext.length) + OUTPUT_EXT;

  await runCommand('npx', [
    'splat-transform',
    `"${inputPath}"`,
    `"${outputPath}"`,
  ]);

  console.log(
    `Converted: ${path.relative(process.cwd(), inputPath)} -> ${path.relative(process.cwd(), outputPath)}`
  );
  return true;
}

async function main() {
  const allFiles = await walk(ROOT_DIR);
  const spzFiles = allFiles.filter((file) => path.extname(file).toLowerCase() === '.spz');

  if (spzFiles.length === 0) {
    console.log('No .spz files found in public/marble');
    return;
  }

  console.log(`Found ${spzFiles.length} .spz file(s)`);

  let success = 0;
  let failed = 0;

  for (const file of spzFiles) {
    try {
      await convertOne(file);
      success += 1;
    } catch (err) {
      failed += 1;
      console.error(`Failed: ${file}`);
      console.error(err);
    }
  }

  console.log(`Done. Success: ${success}, Failed: ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});