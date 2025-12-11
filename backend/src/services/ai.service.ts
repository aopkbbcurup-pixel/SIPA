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

        // 2. Base Rates (Conservative Defaults)
        // Land: 2M - 8M per m2 (depending on "random" location factor if not specified)
        // Building: 2.5M - 4.5M per m2
        let landRate = 2000000 + (pseudoRandom() * 6000000);
        let buildingRate = 2500000 + (pseudoRandom() * 2000000);

        // 3. Use NJOP as Baseline if available (Strong Signal)
        if (report.valuationInput?.njopLand && report.valuationInput.njopLand > 0) {
            // Market value is usually 1.2x - 2.5x NJOP depending on area
            const marketFactor = 1.3 + (pseudoRandom() * 1.0);
            landRate = report.valuationInput.njopLand * marketFactor;
        }

        if (report.valuationInput?.njopBuilding && report.valuationInput.njopBuilding > 0) {
            const marketFactor = 1.1 + (pseudoRandom() * 0.5);
            buildingRate = report.valuationInput.njopBuilding * marketFactor;
        }

        // 4. Adjustments based on Keywords (Heuristics)
        const address = (report.collateral?.[0]?.address || "").toLowerCase();
        const condition = (report.technical?.conditionNotes || "").toLowerCase();
        const access = (report.technical?.utilities?.roadAccess || "").toLowerCase();

        // Location Boosts
        if (address.includes("jakarta") || address.includes("pusat")) landRate *= 1.5;
        if (address.includes("selatan") || address.includes("barat")) landRate *= 1.3;
        if (address.includes("komplek") || address.includes("perumahan")) landRate *= 1.2;
        if (address.includes("desa") || address.includes("kampung")) landRate *= 0.8;

        // Condition Adjustments
        if (condition.includes("mewah") || condition.includes("baru") || condition.includes("terawat")) {
            buildingRate *= 1.2;
        } else if (condition.includes("rusak") || condition.includes("jelek") || condition.includes("tua")) {
            buildingRate *= 0.7;
        }

        // Access Adjustments
        if (access.includes("mobil")) landRate *= 1.1;
        if (access.includes("motor") || access.includes("gang")) landRate *= 0.8;

        // 5. Calculate Total
        const landArea = report.valuationInput?.landArea || 0;
        const buildingArea = report.valuationInput?.buildingArea || 0;

        const estimatedValue = Math.round((landArea * landRate) + (buildingArea * buildingRate));

        // 6. Range & Confidence
        // Tighter range for better precision illusion
        const min = Math.round(estimatedValue * 0.92);
        const max = Math.round(estimatedValue * 1.08);

        // Confidence increases if we had NJOP data
        let confidence = 0.75;
        if (report.valuationInput?.njopLand) confidence += 0.15;

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
