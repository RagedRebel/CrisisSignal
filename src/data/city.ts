export interface CityMetadata {
  name: string;
  state: string;
  country: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  bbox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  riverPolyline: [number, number][]; // Vrishabhavathi valley, the main mapped channel
  tributaryPolylines?: [number, number][][]; // Koramangala and Hebbal stormwater valleys
  totalPopulation: number;
  controlRoomCoords: [number, number];
}

export const BENGALURU_CITY: CityMetadata = {
  name: "Greater Bengaluru Flood Replay",
  state: "Karnataka",
  country: "India",
  center: [12.97, 77.62],
  zoom: 11,
  bbox: {
    minLat: 12.75,
    maxLat: 13.3,
    minLng: 77.35,
    maxLng: 78.05,
  },
  // Vrishabhavathi river: from Kempambudhi through Nayandahalli toward RR Nagar.
  riverPolyline: [
    [12.945, 77.527],
    [12.938, 77.515],
    [12.926, 77.512],
    [12.902, 77.512],
    [12.86, 77.5],
    [12.8, 77.48],
  ],
  tributaryPolylines: [
    // Koramangala–Chetan stormwater valley (Ejipura / Bellandur side).
    [
      [12.935, 77.62],
      [12.938, 77.64],
      [12.941, 77.665],
      [12.94, 77.69],
    ],
    // Hebbal valley (Hebbal lake toward Nagawara).
    [
      [13.045, 77.591],
      [13.036, 77.61],
      [13.028, 77.635],
      [13.018, 77.66],
    ],
    // Jakkur–Thanisandra wetland overflow line.
    [
      [13.078, 77.607],
      [13.075, 77.62],
      [13.072, 77.636],
      [13.068, 77.655],
    ],
  ],
  totalPopulation: 13000000,
  controlRoomCoords: [12.9627, 77.577],
};
