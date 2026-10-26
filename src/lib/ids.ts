export function createId(): string {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('This browser cannot generate secure identifiers.');
  }

  return crypto.randomUUID();
}
