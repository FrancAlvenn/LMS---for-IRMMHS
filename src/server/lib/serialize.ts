/**
 * Mongoose lean()/toObject() results keep Date instances; API DTOs want
 * ISO strings (see src/types/*.ts). Repositories call this when mapping a
 * raw doc to its DTO shape.
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}
