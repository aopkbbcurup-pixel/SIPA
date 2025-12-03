import { db } from "../store/database";

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
        // Fetch all reports (in a real app with many records, we'd use a geospatial query supported by the DB)
        // Since we are using Firestore/JSON/Mongo abstraction without native geo-query in the interface,
        // we'll fetch all (or recent) reports and filter in memory.
        const reports = await db.getReports({ status: "approved" });

        const comparables: ComparableProperty[] = [];

        for (const report of reports) {
            // Skip if no coordinates
            const reportLat = report.collateral[0]?.latitude;
            const reportLng = report.collateral[0]?.longitude;

            if (!reportLat || !reportLng) continue;

            const distance = this.calculateDistance(lat, lng, reportLat, reportLng);

            if (distance <= radiusKm * 1000) { // Convert radius to meters
                const valuation = report.valuationResult;
                const input = report.valuationInput;

                // Estimate price (Market Value)
                const price = valuation.marketValue || (valuation.land?.valueBeforeSafety || 0) + (valuation.building?.valueBeforeSafety || 0);

                // Determine type
                let type: "house" | "land" | "shophouse" = "house";
                if (input.buildingArea === 0) type = "land";
                // Simple heuristic for shophouse could be based on zoning or other fields, defaulting to house for now

                comparables.push({
                    id: report.id,
                    lat: reportLat,
                    lng: reportLng,
                    address: report.collateral[0]?.address || report.generalInfo.customerAddress || "Alamat tidak tersedia",
                    price: price,
                    landArea: input.landArea,
                    buildingArea: input.buildingArea,
                    type: type,
                    distance: Math.round(distance)
                });
            }
        }

        return comparables.sort((a, b) => a.distance - b.distance).slice(0, 10); // Limit to closest 10
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // in metres
    }
}

export const gisService = new GisService();
