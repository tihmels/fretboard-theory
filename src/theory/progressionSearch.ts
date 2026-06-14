import type { ProgressionStep } from './progression'

export function hooktheoryBasicDegreesFromSteps(steps: ProgressionStep[]): number[] {
  return steps
    .map(step => step.degree)
    .filter(degree => Number.isInteger(degree) && degree >= 1 && degree <= 7)
}

export function hooktheoryBasicChildPathFromSteps(steps: ProgressionStep[]): string {
  return hooktheoryBasicDegreesFromSteps(steps).join(',')
}
