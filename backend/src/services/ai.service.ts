import { Report } from "../types/domain";
import { ExtractedDocumentData, BuildingAnalysisResult } from "../types/ai";

export class AiService {
    async generateReportRemarks(report: Partial<Report>): Promise<string> {
        // Simulate AI processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Simple rule-based generation to mimic AI
        const customerName = report.generalInfo?.customerName || "Nasabah";
        const propertyType = report.collateral?.[0]?.kind === "land" ? "Tanah Kosong" : "Tanah dan Bangunan";
        const marketValue = report.valuationResult?.marketValue || 0;
        const location = report.collateral?.[0]?.address || "lokasi yang ditinjau";

        const condition = report.technical?.conditionNotes || "terawat dengan baik";
        const roadAccess = report.technical?.utilities?.roadAccess || "dapat dilalui kendaraan roda 4";

        return `Berdasarkan hasil penilaian yang dilakukan terhadap properti atas nama ${customerName} yang berlokasi di ${location}, berikut adalah kesimpulan kami:

1. Objek penilaian berupa ${propertyType} dengan kondisi fisik ${condition}.
2. Aksesibilitas menuju lokasi ${roadAccess}, yang mendukung nilai ekonomis properti.
3. Berdasarkan analisis pasar dan data pembanding yang relevan, Nilai Pasar (Market Value) properti ini diestimasi sebesar Rp ${marketValue.toLocaleString("id-ID")}.
4. Properti ini dinilai layak dan marketable untuk dijadikan agunan kredit dengan memperhatikan faktor likuiditas dan legalitas yang telah diverifikasi.

Demikian laporan penilaian ini dibuat untuk digunakan sebagaimana mestinya.`;
    }

    async predictPropertyPrice(report: Partial<Report>): Promise<{ min: number; max: number; confidence: number }> {
        // Simulate AI processing delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // 1. Deterministic Seed based on Report ID or Customer Name to ensure consistency
        const seedString = report.id || report.generalInfo?.customerName || "default";
        let hash = 0;
        for (let i = 0; i < seedString.length; i++) {
            hash = ((hash << 5) - hash) + seedString.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        const pseudoRandom = () => {
            hash = (hash * 9301 + 49297) % 233280;
            return hash / 233280;
        };

        // 2. Use NJOP as PRIMARY Baseline (Most Reliable)
        let landRate = 0;
        let buildingRate = 0;
        let confidence = 0.5;

        if (report.valuationInput?.njopLandPerM2 && report.valuationInput.njopLandPerM2 > 0) {
            // Market value is typically 0.8x - 1.3x NJOP (more conservative)
            const marketFactor = 0.8 + (pseudoRandom() * 0.5);
            landRate = report.valuationInput.njopLandPerM2 * marketFactor;
            confidence += 0.2;
        } else if (report.valuationInput?.njopLand && report.valuationInput.njopLand > 0) {
            // Fallback to total NJOP if per-m2 not available
            const landArea = report.valuationInput?.landArea || 1;
            const njopPerM2 = report.valuationInput.njopLand / landArea;
            const marketFactor = 0.8 + (pseudoRandom() * 0.5);
            landRate = njopPerM2 * marketFactor;
            confidence += 0.15;
        } else {
            // Conservative default if no NJOP (much lower than before)
            landRate = 300000 + (pseudoRandom() * 700000); // 300k-1M per m2
        }

        if (report.valuationInput?.njopBuildingPerM2 && report.valuationInput.njopBuildingPerM2 > 0) {
            // Building market value closer to NJOP
            const marketFactor = 0.9 + (pseudoRandom() * 0.3);
            buildingRate = report.valuationInput.njopBuildingPerM2 * marketFactor;
            confidence += 0.2;
        } else if (report.valuationInput?.njopBuilding && report.valuationInput.njopBuilding > 0) {
            // Fallback to total NJOP
            const buildingArea = report.valuationInput?.buildingArea || 1;
            const njopPerM2 = report.valuationInput.njopBuilding / buildingArea;
            const marketFactor = 0.9 + (pseudoRandom() * 0.3);
            buildingRate = njopPerM2 * marketFactor;
            confidence += 0.15;
        } else {
            // Conservative default if no NJOP
            buildingRate = 500000 + (pseudoRandom() * 1000000); // 500k-1.5M per m2
        }

        // 3. Minor Adjustments based on Keywords (More Conservative)
        const address = (report.collateral?.[0]?.address || "").toLowerCase();
        const condition = (report.technical?.conditionNotes || "").toLowerCase();

        // Location Adjustments (reduced multipliers)
        if (address.includes("jakarta") || address.includes("pusat")) {
            landRate *= 1.15;
        } else if (address.includes("selatan") || address.includes("barat")) {
            landRate *= 1.08;
        } else if (address.includes("desa") || address.includes("kampung")) {
            landRate *= 0.9;
        }

        // Condition Adjustments (minimal impact)
        if (condition.includes("mewah") || condition.includes("baru")) {
            buildingRate *= 1.1;
        } else if (condition.includes("rusak") || condition.includes("jelek")) {
            buildingRate *= 0.85;
        }

        // 4. Calculate Total
        const landArea = report.valuationInput?.landArea || 0;
        const buildingArea = report.valuationInput?.buildingArea || 0;

        const estimatedValue = Math.round((landArea * landRate) + (buildingArea * buildingRate));

        // 5. Range (±5% for tighter prediction)
        const min = Math.round(estimatedValue * 0.95);
        const max = Math.round(estimatedValue * 1.05);

        return { min, max, confidence };
    }

    async chatWithData(query: string, reports: Partial<Report>[]): Promise<string> {
        // Simulate AI processing delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const lowerQuery = query.toLowerCase();

        // Simple keyword matching logic (Mock RAG)
        if (lowerQuery.includes("berapa") && lowerQuery.includes("laporan")) {
            return `Saat ini terdapat total ${reports.length} laporan dalam sistem.`;
        }

        if (lowerQuery.includes("terbaru") || lowerQuery.includes("terakhir")) {
            const latest = reports[0];
            if (!latest) return "Belum ada laporan yang tersedia.";
            return `Laporan terbaru adalah untuk nasabah ${latest.generalInfo?.customerName} dengan nomor ${latest.generalInfo?.reportNumber}.`;
        }

        // Search for specific customer
        // Match if ANY word of the customer name appears in the query as a whole word
        const customerMatch = reports.find(r => {
            if (!r.generalInfo?.customerName) return false;
            const nameParts = r.generalInfo.customerName.toLowerCase().split(/\s+/);

            return nameParts.some(part => {
                if (part.length < 3) return false; // Skip very short name parts to avoid false positives
                const escapedPart = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedPart}\\b`, 'i');
                return regex.test(query);
            });
        });

        if (customerMatch) {
            const marketValue = customerMatch.valuationResult?.marketValue;
            const valueStr = marketValue ? `Rp ${marketValue.toLocaleString("id-ID")}` : "belum dinilai";
            return `Laporan untuk ${customerMatch.generalInfo?.customerName} (No: ${customerMatch.generalInfo?.reportNumber}) memiliki nilai pasar ${valueStr}. Status saat ini: ${customerMatch.status}.`;
        }

        return "Maaf, saya tidak menemukan informasi spesifik terkait pertanyaan Anda dalam data laporan yang tersedia. Coba tanyakan tentang 'jumlah laporan', 'laporan terbaru', atau nama nasabah spesifik.";
    }

    async extractDocumentData(file: Express.Multer.File): Promise<ExtractedDocumentData> {
        // Simulate OCR processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const filename = file.originalname.toLowerCase();

        // Mock Logic based on filename
        if (filename.includes("shm")) {
            return {
                type: "SHM",
                number: "12345/Kel. Tebet",
                issueDate: "2010-05-20",
                holderName: "Budi Santoso",
                area: 150
            };
        }

        if (filename.includes("imb") || filename.includes("pbg")) {
            return {
                type: "IMB",
                number: "IMB/2020/001",
                issueDate: "2020-01-15",
                area: 200
            };
        }

        if (filename.includes("pbb")) {
            return {
                type: "PBB",
                number: "32.73.120.001.000.0000.0",
                issueDate: new Date().toISOString().slice(0, 10),
                year: "2024",
                nop: "32.73.120.001.000.0000.0"
            };
        }

        // Default mock data if type unknown
        return {
            type: "Other",
            number: "DOC-001",
            issueDate: new Date().toISOString().slice(0, 10)
        };
    }

    async analyzeImage(file: Express.Multer.File): Promise<BuildingAnalysisResult> {
        // Simulate CV processing delay
        await new Promise((resolve) => setTimeout(resolve, 2500));

        const filename = file.originalname.toLowerCase();

        // Base result
        let result = {
            buildingStructure: "Beton Bertulang",
            wallMaterial: "Bata Merah",
            floorMaterial: "Keramik",
            roofMaterial: "Genteng Metal",
            conditionNotes: "Kondisi bangunan standar dan layak huni. Perawatan rutin diperlukan."
        };

        // Granular Material Detection based on keywords

        // Floor
        if (filename.includes("granit")) result.floorMaterial = "Granit";
        if (filename.includes("marmer")) result.floorMaterial = "Marmer";
        if (filename.includes("parket") || filename.includes("kayu")) result.floorMaterial = "Parket / Kayu";
        if (filename.includes("vinyl")) result.floorMaterial = "Vinyl";

        // Roof
        if (filename.includes("beton")) result.roofMaterial = "Dak Beton";
        if (filename.includes("keramik")) result.roofMaterial = "Genteng Keramik";
        if (filename.includes("seng") || filename.includes("asbes")) result.roofMaterial = "Seng / Asbes";

        // Wall
        if (filename.includes("bata ringan") || filename.includes("hebel")) result.wallMaterial = "Bata Ringan";
        if (filename.includes("kaca")) result.wallMaterial = "Kaca / Curtain Wall";

        // Condition Overrides
        if (filename.includes("rusak") || filename.includes("jelek") || filename.includes("hancur")) {
            result.conditionNotes = "Kondisi bangunan kurang terawat, terdapat kerusakan signifikan. Butuh renovasi berat.";
            if (!filename.includes("beton")) result.buildingStructure = "Kayu / Semi Permanen"; // Assume semi-permanent if damaged unless specified
        }

        if (filename.includes("mewah") || filename.includes("bagus") || filename.includes("premium")) {
            result.conditionNotes = "Bangunan sangat terawat, spesifikasi material premium. Tidak ada kerusakan terlihat.";
            if (result.floorMaterial === "Keramik") result.floorMaterial = "Granit"; // Upgrade default floor if luxury
        }

        return result;
    }
}

export const aiService = new AiService();
