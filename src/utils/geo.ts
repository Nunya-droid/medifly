/** Straight-line distance between two coordinates (km). */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Road distance estimate: straight line × winding factor, with a small floor for same-area trips. */
export function roadDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return Math.max(1.2, haversineKm(a, b) * 1.35);
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** Round to the nearest 50 pesewas. */
export function roundFee(n: number) {
  return Math.round(n * 2) / 2;
}
