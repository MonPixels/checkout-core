import { assertCents, type Cents } from "./money";

export interface Product {
  sku: string;
  name: string;
  /** Price of one unit, in cents. */
  unitPrice: Cents;
}

export interface CartLine extends Product {
  quantity: number;
}

export const MAX_QUANTITY_PER_LINE = 99;

export class Cart {
  private readonly lines = new Map<string, CartLine>();

  /** Adds a product, or increases its quantity if it is already in the cart. */
  add(product: Product, quantity = 1): void {
    assertCents(product.unitPrice, `unitPrice for ${product.sku}`);
    assertQuantity(quantity);

    const existing = this.lines.get(product.sku);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    assertQuantity(nextQuantity);

    this.lines.set(product.sku, { ...product, quantity: nextQuantity });
  }

  /** Sets the exact quantity of a line. A quantity of 0 removes the line. */
  setQuantity(sku: string, quantity: number): void {
    const line = this.lines.get(sku);
    if (!line) throw new Error(`No line with sku ${sku} in the cart`);
    if (quantity === 0) {
      this.lines.delete(sku);
      return;
    }
    assertQuantity(quantity);
    this.lines.set(sku, { ...line, quantity });
  }

  remove(sku: string): void {
    this.lines.delete(sku);
  }

  items(): CartLine[] {
    return [...this.lines.values()];
  }

  itemCount(): number {
    return this.items().reduce((count, line) => count + line.quantity, 0);
  }

  isEmpty(): boolean {
    return this.lines.size === 0;
  }

  /** Sum of every line's unit price times quantity, in cents. */
  subtotal(): Cents {
    return this.items().reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  }
}

function assertQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE) {
    throw new RangeError(`Quantity must be a whole number from 1 to ${MAX_QUANTITY_PER_LINE}, got ${quantity}`);
  }
}
