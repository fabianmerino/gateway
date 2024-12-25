export function generateSensorValue(
  min: number,
  max: number,
  decimals = 2
): number {
  const value = min + Math.random() * (max - min);
  return Number(value.toFixed(decimals));
}
