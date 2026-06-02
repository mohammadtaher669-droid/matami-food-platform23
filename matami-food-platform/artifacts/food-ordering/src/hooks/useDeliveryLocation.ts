import { useState, useCallback } from "react";

export type LocationStatus = "idle" | "requesting" | "granted" | "denied" | "error";

export interface UserCoords {
  lat: number;
  lng: number;
}

const SESSION_KEY = "matami_user_location";

function loadCached(): UserCoords | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useDeliveryLocation() {
  const cached = loadCached();
  const [coords, setCoords] = useState<UserCoords | null>(cached);
  const [status, setStatus] = useState<LocationStatus>(cached ? "granted" : "idle");

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: UserCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(loc);
        setStatus("granted");
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(loc)); } catch {}
      },
      (err) => {
        setStatus(err.code === GeolocationPositionError.PERMISSION_DENIED ? "denied" : "error");
      },
      { timeout: 12000, maximumAge: 120000 }
    );
  }, []);

  const clear = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setCoords(null);
    setStatus("idle");
  }, []);

  return { coords, status, request, clear };
}
