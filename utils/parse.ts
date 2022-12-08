export function parseHandle(query: string): { localPart: string, domain: string | null } {
  // Remove the leading @, if there's one.
  if (query.startsWith("@")) {
    query = query.substring(1);
  }

  // In case the handle has been URL encoded
  query = decodeURIComponent(query);

  const parts = query.split("@");
  if (parts.length > 1) {
    return { localPart: parts[0], domain: parts[1] };
  } else {
    return { localPart: parts[0], domain: null };
  }
}
