const STATIC_MAP_DEFAULT_SIZE = "640x400";

declare global {
  interface Window {
    __SIPA_GOOGLE_MAPS_KEY__?: string;
  }
}

let cachedMapsKey: string | null | undefined;

export function getGoogleMapsApiKey(): string | null {
  if (cachedMapsKey !== undefined) {
    return cachedMapsKey;
  }

  let key: string | null = null;
  if (typeof window !== "undefined" && window.__SIPA_GOOGLE_MAPS_KEY__) {
    key = window.__SIPA_GOOGLE_MAPS_KEY__ ?? null;
  } else if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  }

  cachedMapsKey = key ?? null;
  return cachedMapsKey;
}

export function buildGoogleMapsLink(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function buildGoogleMapsEmbedUrl(latitude: number, longitude: number, zoom = 18): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}&z=${zoom}&output=embed`;
}

export function buildStaticMapUrl(
  latitude: number,
  longitude: number,
  options?: { zoom?: number; size?: string; mapType?: "roadmap" | "satellite" | "terrain" | "hybrid" },
): string | null {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return null;
  }
  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: String(options?.zoom ?? 18),
    size: options?.size ?? STATIC_MAP_DEFAULT_SIZE,
    maptype: options?.mapType ?? "satellite",
    markers: `color:red|${latitude},${longitude}`,
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
