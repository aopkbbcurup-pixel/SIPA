export interface ComparableProperty {
    id: string;
    lat: number;
    lng: number;
    address: string;
    price: number;
    landArea: number;
    buildingArea: number;
    type: "house" | "land" | "shophouse";
    distance: number; // in meters
}

export class GisService {
    async getNearbyComparables(lat: number, lng: number, radiusKm: number = 1): Promise<ComparableProperty[]> {
        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Mock Data Generation
        // Generate 5-10 random properties around the center point
        const count = 5 + Math.floor(Math.random() * 5);
        const comparables: ComparableProperty[] = [];

        for (let i = 0; i < count; i++) {
            // Random offset for lat/lng (approx 111km per degree)
            // 0.001 degree is approx 111 meters
            const latOffset = (Math.random() - 0.5) * 0.01; // +/- 500m approx
            const lngOffset = (Math.random() - 0.5) * 0.01;

            const type = Math.random() > 0.3 ? "house" : (Math.random() > 0.5 ? "land" : "shophouse");
            const landArea = 60 + Math.floor(Math.random() * 200);
            const buildingArea = type === "land" ? 0 : 36 + Math.floor(Math.random() * 150);

            // Price estimation mock
            const pricePerMeter = 5000000 + Math.random() * 5000000;
            const price = (landArea * pricePerMeter) + (buildingArea * 3000000);

            comparables.push({
                id: `comp-${i + 1}`,
                lat: lat + latOffset,
                lng: lng + lngOffset,
                address: `Jl. Contoh Sekitar No. ${i + 1}, Jakarta`,
                price: Math.round(price),
                landArea,
                buildingArea,
                type,
                distance: Math.round(Math.sqrt(latOffset * latOffset + lngOffset * lngOffset) * 111000) // Rough distance in meters
            });
        }

        return comparables.sort((a, b) => a.distance - b.distance);
    }
}

export const gisService = new GisService();
