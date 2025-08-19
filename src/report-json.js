export function buildJsonReport({ scan, components }) {
  const { files, maxes } = scan;
  return {
    meta: {
      generatedAt: new Date().toISOString(),
      components
    },
    maxes,
    items: files
  };
}
