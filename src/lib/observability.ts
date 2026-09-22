// Deliberately accept only controlled event names/IDs, never exceptions,
// request bodies, email addresses, keys, signed URLs, or photo contents.
export function operationalEvent(event: string, id?: string) {
  console.error(
    JSON.stringify({
      event,
      ...(id ? { id } : {}),
      at: new Date().toISOString(),
    }),
  );
}
