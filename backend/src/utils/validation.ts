import { ValuationInput } from "../types/domain";

export function validateValuationInput(input: Partial<ValuationInput>): string[] {
    const errors: string[] = [];

    // NJOP validation
    if (input.njopLandPerM2 !== undefined && input.njopLandPerM2 !== null) {
        if (input.njopLandPerM2 < 1000 || input.njopLandPerM2 > 100000000) {
            errors.push('NJOP Tanah harus antara Rp 1,000 - Rp 100,000,000 per m²');
        }
    }

    if (input.njopBuildingPerM2 !== undefined && input.njopBuildingPerM2 !== null) {
        if (input.njopBuildingPerM2 < 1000 || input.njopBuildingPerM2 > 100000000) {
            errors.push('NJOP Bangunan harus antara Rp 1,000 - Rp 100,000,000 per m²');
        }
    }

    // Area validation
    if (input.landArea !== undefined && input.landArea !== null) {
        if (input.landArea < 1) {
            errors.push('Luas tanah harus minimal 1 m²');
        }
    }

    if (input.buildingArea !== undefined && input.buildingArea !== null) {
        if (input.buildingArea < 1) {
            errors.push('Luas bangunan harus minimal 1 m²');
        }
    }

    // Percentage validation
    if (input.safetyMarginPercent !== undefined && input.safetyMarginPercent !== null) {
        if (input.safetyMarginPercent < 0 || input.safetyMarginPercent > 100) {
            errors.push('Safety margin harus antara 0-100%');
        }
    }

    if (input.liquidationFactorPercent !== undefined && input.liquidationFactorPercent !== null) {
        if (input.liquidationFactorPercent < 0 || input.liquidationFactorPercent > 100) {
            errors.push('Faktor likuidasi harus antara 0-100%');
        }
    }

    return errors;
}
