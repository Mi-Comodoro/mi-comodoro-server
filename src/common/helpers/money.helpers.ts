/**
 * Redondea un importe a 2 decimales con la regla "half away from zero".
 * NaN e Infinity se devuelven tal cual; -0 se normaliza a 0.
 * Number.EPSILON compensa el error binario (1.005 da 1.01, 2.675 da 2.68).
 */
function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return value;
  const rounded = (Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
  return rounded === 0 ? 0 : rounded;
}

export { roundMoney };
