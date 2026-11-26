/**
 * Reglas de dinero por moneda (patrón Strategy): cómo se redondea un importe y cómo se reparte un total.
 *
 * Hoy COP, USD y EUR usan 2 decimales (ISO 4217 y la regla del producto: ningún importe con 3), así que las
 * tres dan el mismo resultado. Una regla propia de una moneda se añade como otra estrategia en STRATEGIES,
 * sin tocar los servicios.
 */
export interface MoneyStrategy {
  readonly currency: string;
  readonly decimals: number;
  /** Half away from zero a los decimales de la moneda. NaN e Infinity se devuelven tal cual. */
  round(value: number): number;
  /**
   * Reparte `total` en proporción a `weights` sin perder ni crear unidades: la suma de las partes es el total
   * redondeado. Las unidades sobrantes van a las partes con mayor residuo y, en empate, a las primeras de la
   * lista: quien llama pone primero a quien debe recibirlas.
   */
  allocate(total: number, weights: number[]): number[];
}

export class DecimalMoneyStrategy implements MoneyStrategy {
  constructor(
    readonly currency: string,
    readonly decimals: number,
  ) {}

  round(value: number): number {
    if (!Number.isFinite(value)) return value;
    const rounded = (Math.sign(value) * this.toUnits(Math.abs(value))) / 10 ** this.decimals;
    return rounded === 0 ? 0 : rounded;
  }

  allocate(total: number, weights: number[]): number[] {
    const sumOfWeights = weights.reduce((sum, w) => sum + w, 0);
    if (!Number.isFinite(total) || sumOfWeights <= 0) return weights.map(() => 0);

    const sign = Math.sign(total);
    const totalUnits = this.toUnits(Math.abs(total));
    const exact = weights.map((w) => Number(((totalUnits * w) / sumOfWeights).toPrecision(15)));
    const units = exact.map((share) => Math.floor(share));
    const leftover = totalUnits - units.reduce((sum, u) => sum + u, 0);

    exact
      .map((share, index) => ({ index, remainder: Number((share - units[index]).toFixed(6)) }))
      .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
      .slice(0, leftover)
      .forEach(({ index }) => units[index]++);

    return units.map((u) => (u === 0 ? 0 : (sign * u) / 10 ** this.decimals));
  }

  /**
   * Valor no negativo en unidades mínimas (centavos). Se desplaza la coma sobre el texto decimal porque
   * multiplicar en binario falla en los medios centavos (10.075 * 100 = 1007.4999999999999); los 15 dígitos
   * significativos quitan antes el ruido de las operaciones previas.
   */
  private toUnits(value: number): number {
    const text = String(Number(value.toPrecision(15)));
    // Notación exponencial: o es despreciable (1e-7) o demasiado grande para tener centavos
    if (text.includes('e')) return value < 1 ? 0 : value * 10 ** this.decimals;
    return Math.round(Number(`${text}e${this.decimals}`));
  }
}

export const DEFAULT_CURRENCY = 'COP';

const STRATEGIES: Record<string, MoneyStrategy> = {
  COP: new DecimalMoneyStrategy('COP', 2),
  USD: new DecimalMoneyStrategy('USD', 2),
  EUR: new DecimalMoneyStrategy('EUR', 2),
};

/** Una moneda desconocida o ausente usa las reglas de la moneda por defecto. */
export const getMoneyStrategy = (currency?: string | null): MoneyStrategy =>
  STRATEGIES[(currency ?? '').toUpperCase()] ?? STRATEGIES[DEFAULT_CURRENCY];
