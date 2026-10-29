import { type RegressionResults } from '../../types';

function solveNormalEquations(X: number[][], y: number[]): number[] {
  const n = y.length;
  const p = X[0].length;
  
  // Build X'X matrix
  const XtX: number[][] = Array(p).fill(0).map(() => Array(p).fill(0));
  const Xty: number[] = Array(p).fill(0);
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      Xty[j] += X[i][j] * y[i];
      for (let k = 0; k < p; k++) {
        XtX[j][k] += X[i][j] * X[i][k];
      }
    }
  }
  
  // Simple Gaussian elimination for small systems
  const augmented = XtX.map((row, i) => [...row, Xty[i]]);
  
  for (let i = 0; i < p; i++) {
    // Pivot
    let maxRow = i;
    for (let k = i + 1; k < p; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    // Eliminate
    for (let k = i + 1; k < p; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= p; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }
  
  // Back substitution
  const coefficients = Array(p).fill(0);
  for (let i = p - 1; i >= 0; i--) {
    let sum = augmented[i][p];
    for (let j = i + 1; j < p; j++) {
      sum -= augmented[i][j] * coefficients[j];
    }
    coefficients[i] = sum / augmented[i][i];
  }
  
  return coefficients;
}

export function polynomialRegression(
  x: number[],
  y: number[],
  degree: number
): RegressionResults {
  if (x.length !== y.length || x.length === 0) {
    throw new Error('Arrays must have same length and be non-empty');
  }
  
  const n = x.length;
  
  // Build design matrix
  const X: number[][] = x.map(xi => {
    return Array.from({ length: degree + 1 }, (_, i) => Math.pow(xi, i));
  });
  
  // Solve for coefficients
  const coefficients = solveNormalEquations(X, y);
  
  // Predictions
  const predictions = x.map(xi => {
    return coefficients.reduce((sum, c, i) => sum + c * Math.pow(xi, i), 0);
  });
  
  // Residuals
  const residuals = y.map((yi, i) => yi - predictions[i]);
  
  // R-squared
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
  const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
  const rSquared = 1 - ssRes / ssTotal;
  
  // F-statistic
  const p = degree + 1;
  const ssReg = ssTotal - ssRes;
  const fStatistic = (ssReg / (p - 1)) / (ssRes / (n - p));
  
  // Simplified p-value approximation (very rough)
  const pValue = Math.exp(-fStatistic * 0.5);
  
  // MAD (Mean Absolute Deviation)
  const mad = residuals.reduce((sum, r) => sum + Math.abs(r), 0) / n;
  
  return {
    modelType: degree === 1 ? 'linear' : degree === 2 ? 'quadratic' : 'cubic',
    coefficients,
    rSquared: Math.max(0, Math.min(1, rSquared)),
    fStatistic,
    pValue: Math.min(1, Math.max(0, pValue)),
    mad,
    predictions,
    residuals,
  };
}

export function fitAllModels(x: number[], y: number[]): RegressionResults[] {
  return [1, 2, 3].map(degree => polynomialRegression(x, y, degree));
}

export function selectBestModel(results: RegressionResults[], validationMad?: number[]): RegressionResults {
  // If validation MAD provided, use that; otherwise use training MAD
  const madValues = validationMad || results.map(r => r.mad);
  
  let bestIndex = 0;
  let bestMad = madValues[0];
  
  for (let i = 1; i < madValues.length; i++) {
    if (madValues[i] < bestMad || 
        (Math.abs(madValues[i] - bestMad) < 0.01 && results[i].modelType === 'linear')) {
      bestMad = madValues[i];
      bestIndex = i;
    }
  }
  
  return results[bestIndex];
}
