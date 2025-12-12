import { ValuationInput } from "../types/domain";

/**
 * Validates email format using RFC 5322 compliant regex
 */
export function validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validates Indonesian phone number format
 * Accepts: 08xx, +628xx, 628xx, 02xx (landline)
 */
export function validatePhoneNumber(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;

    const cleanPhone = phone.trim().replace(/[\s-]/g, '');

    // Indonesian mobile: 08xx (10-13 digits), +628xx, or 628xx
    const mobileRegex = /^(\+?62|0)8[0-9]{8,11}$/;

    // Indonesian landline: 02xx (9-11 digits)
    const landlineRegex = /^(\+?62|0)2[0-9]{7,9}$/;

    return mobileRegex.test(cleanPhone) || landlineRegex.test(cleanPhone);
}

/**
 * Validates valuation input values to ensure data integrity.
 */
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
