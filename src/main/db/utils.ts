import { v4 as uuidv4 } from "uuid";

export const newId = () => uuidv4();
export const now = () => new Date().toISOString();

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class InsufficientStockError extends Error {
  constructor(productId: string, available: number, requested: number) {
    super(
      `Insufficient stock for product ${productId}. Available: ${available}, Requested: ${requested}`
    );
    this.name = "InsufficientStockError";
  }
}

/** Generate sequential human-readable document numbers */
export function generateDocNumber(prefix: string): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
