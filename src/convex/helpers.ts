export async function generateSessionToken(secret: string, timestamp: number) {
  // 15 second window
  const windowStep = Math.floor(timestamp / 15000);
  const data = secret + windowStep.toString();
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
