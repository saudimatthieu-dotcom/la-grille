export function checkBody(body: Record<string, unknown>, keys: string[]) {
  let isValid = true;

  for (const field of keys) {
    if (!body[field] || body[field] === "") {
      isValid = false;
    }
  }

  return isValid;
}
