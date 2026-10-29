import { type RegressionResults } from '../../types';
import { polynomialRegression } from './regression';

export function generateForecast(
  xForecast: number[],
  modelResults: RegressionResults[]
): RegressionResults[] {
  return modelResults.map(results => {
    const forecastValues = xForecast.map(x => {
      return results.coefficients.reduce((sum, c, i) => sum + c * Math.pow(x, i), 0);
    });
    
    return {
      ...results,
      predictions: [...results.predictions, ...forecastValues],
    };
  });
}

export function computeThreeMonthAverage(y: number[]): number[] {
  const result = [...y];
  for (let i = 3; i < y.length; i++) {
    const avg = (y[i - 3] + y[i - 2] + y[i - 1]) / 3;
    result[i] = avg;
  }
  return result;
}

export function computeMAD(actual: number[], forecast: number[]): number {
  if (actual.length !== forecast.length) {
    throw new Error('Arrays must have same length');
  }
  
  const n = actual.length;
  const mad = actual.reduce((sum, a, i) => sum + Math.abs(a - forecast[i]), 0) / n;
  return mad;
}

export function forecastWithValidation(
  xAll: number[],
  yAll: number[],
  trainEndIndex: number
) {
  const xTrain = xAll.slice(0, trainEndIndex + 1);
  const yTrain = yAll.slice(0, trainEndIndex + 1);
  
  // Fit models on training data
  const modelResults = [1, 2, 3].map(degree => 
    polynomialRegression(xTrain, yTrain, degree)
  );
  
  // Validation data
  const xValidation = xAll.slice(trainEndIndex + 1);
  const yValidation = yAll.slice(trainEndIndex + 1);
  
  // Forecast validation period
  const validationForecasts = modelResults.map(results => {
    const preds = xValidation.map(x => 
      results.coefficients.reduce((sum, c, i) => sum + c * Math.pow(x, i), 0)
    );
    return {
      predictions: preds,
      mad: computeMAD(yValidation, preds),
    };
  });
  
  // Find best model
  const bestModelIndex = validationForecasts.reduce((bestIdx, curr, i) => {
    return curr.mad < validationForecasts[bestIdx].mad ? i : bestIdx;
  }, 0);
  
  const bestModel = modelResults[bestModelIndex];
  
  // Forecast future months
  const xFuture = xAll.slice(trainEndIndex + 1).length >= 1
    ? Array.from({ length: 6 }, (_, i) => xAll[xTrain.length - 1] + i + 1)
    : Array.from({ length: 6 }, (_, i) => xTrain[xTrain.length - 1] + i + 1);
  
  const futureForecasts = xFuture.map(x =>
    bestModel.coefficients.reduce((sum, c, i) => sum + c * Math.pow(x, i), 0)
  );
  
  // Three-month average baseline
  const smoothed = computeThreeMonthAverage(yTrain);
  const smoothedValidation = xValidation.map((_, i) => {
    const idx = trainEndIndex - 2 + i + 1;
    if (idx >= 0 && idx < smoothed.length) {
      return smoothed[idx];
    }
    return null;
  }).filter(v => v !== null) as number[];
  
  const smoothedMAD = smoothedValidation.length === yValidation.length
    ? computeMAD(yValidation, smoothedValidation)
    : null;
  
  return {
    models: modelResults,
    bestModel,
    bestModelIndex,
    validationForecasts,
    validationMad: validationForecasts.map(v => v.mad),
    smoothedMAD,
    futureForecasts,
    xFuture,
    yValidation,
    xValidation,
  };
}
