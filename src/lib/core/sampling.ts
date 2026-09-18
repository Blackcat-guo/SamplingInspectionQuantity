const THRESHOLDS = [8, 15, 25, 50, 90, 150, 280, 500, 1200, 3200, 10000, 35000, 150000, 500000];
const SAMPLES = [2, 3, 5, 8, 13, 20, 32, 50, 80, 125, 200, 315, 500, 800];

function slowSampling(n: number): number {
  if (n <= 0) return 0;
  for (let i = 0; i < THRESHOLDS.length; i++) if (n <= THRESHOLDS[i]) return SAMPLES[i];
  return 1250;
}

const LUT = new Uint16Array(10001);
for (let i = 0; i < LUT.length; i++) LUT[i] = slowSampling(i);

export function calcSampling(incoming: unknown): number {
  const n = Math.floor(Number(incoming)) || 0;
  if (n <= 0) return 0;
  if (n < 10001) return LUT[n];
  return slowSampling(n);
}
