import { useCallback, useState } from 'react';

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export function useGeolocation() {
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPosition = useCallback(async (): Promise<GeolocationCoords> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const msg = 'Geolocation is not supported by your browser.';
        setError(msg);
        reject(new Error(msg));
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        position => {
          const c: GeolocationCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setCoords(c);
          setLoading(false);
          resolve(c);
        },
        err => {
          setLoading(false);
          let msg = 'Failed to get current location.';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'GPS / Location permission was denied. Please allow location access to share emergency coordinates.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Location information is currently unavailable.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'GPS location request timed out.';
          }
          setError(msg);
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    });
  }, []);

  return { coords, loading, error, getPosition };
}
