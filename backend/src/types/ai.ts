// AI Service types for extracted/analyzed data

export interface ExtractedDocumentData {
    type: string;
    number: string;
    issueDate: string;
    holderName?: string;
    area?: number;
    year?: string;
    nop?: string;
}

export interface BuildingAnalysisResult {
    buildingStructure: string;
    wallMaterial: string;
    floorMaterial: string;
    roofMaterial: string;
    conditionNotes: string;
}
