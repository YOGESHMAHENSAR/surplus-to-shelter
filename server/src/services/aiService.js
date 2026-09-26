import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Runs the SAM segmentation + volume calculation Python script
 * Estimates the weight of food in a container using edge detection and volume heuristics
 * @param {string} imagePath - Absolute path to uploaded image file
 * @param {number} scale - Scale factor (cm per pixel), default 0.05
 * @param {number} height - Assumed container height (cm), default 10.0
 * @param {number} density - Density preset (g/cm³), default 1.0
 * @returns {Promise<Object>} Segmentation result with volume and estimated mass
 */
export function runSegmentDensityModel(imagePath, scale = 0.05, height = 10.0, density = 1.0) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'segment_density.py');

    const pythonProcess = spawn('python', [
      scriptPath,
      imagePath,
      scale.toString(),
      height.toString(),
      density.toString()
    ]);

    let resultData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}: ${errorData}`));
      }

      try {
        const parsed = JSON.parse(resultData);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse SAM output: ${resultData}`));
      }
    });
  });
}

export default runSegmentDensityModel;