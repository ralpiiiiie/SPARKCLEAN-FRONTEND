import { type DescriptiveStats } from '../../types';

export function computeDescriptiveStats(data: number[]): DescriptiveStats {
  if (data.length === 0) {
    throw new Error('Data array cannot be empty');
  }

  const sorted = [...data].sort((a, b) => a - b);
  const n = data.length;
  
  const mean = data.reduce((sum, x) => sum + x, 0) / n;
  const median = n % 2 === 0 
    ? (sorted[Math.floor(n / 2) - 1] + sorted[Math.floor(n / 2)]) / 2
    : sorted[Math.floor(n / 2)];
  
  const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const stdError = stdDev / Math.sqrt(n);
  
  const frequencies: Record<number, number> = {};
  data.forEach(x => {
    frequencies[x] = (frequencies[x] || 0) + 1;
  });
  const mode = Object.entries(frequencies)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const sum = data.reduce((s, x) => s + x, 0);
  
  // Skewness (Fisher-Pearson standardized moment coefficient)
  const skewness = data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 3), 0) / n;
  
  // Kurtosis (excess kurtosis)
  const kurtosis = data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 4), 0) / n - 3;
  
  return {
    mean,
    median,
    mode: mode ? Number(mode) : undefined,
    stdDev,
    stdError,
    variance,
    kurtosis,
    skewness,
    min,
    max,
    range,
    sum,
    count: n,
  };
}

export function computeCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    throw new Error('Arrays must have same length and be non-empty');
  }
  
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  
  return numerator / Math.sqrt(denomX * denomY);
}
