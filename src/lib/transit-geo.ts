
export type LatLng = {
  latitude: number;
  longitude: number;
};

export function distanceKm(a: LatLng, b: LatLng): number {
  const earthRadiusKm = 6371;
  const rad = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);

  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm *
    Math.asin(Math.min(1, Math.sqrt(value)));
}

export function estimateEtaMinutes(
  distance: number,
  speedKmh = 18
): number {
  const effectiveSpeed = Math.max(5, Math.min(speedKmh, 60));
  return Math.max(1, Math.ceil((distance / effectiveSpeed) * 60));
}
