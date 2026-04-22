const EARTH_RADIUS_METERS = 6371000

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}

export function calculateDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const deltaLat = toRadians(latitudeB - latitudeA)
  const deltaLon = toRadians(longitudeB - longitudeA)

  const latA = toRadians(latitudeA)
  const latB = toRadians(latitudeB)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_METERS * c
}
