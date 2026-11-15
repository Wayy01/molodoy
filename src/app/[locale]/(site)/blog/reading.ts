export function readingMinutes(text: string) {
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
}
