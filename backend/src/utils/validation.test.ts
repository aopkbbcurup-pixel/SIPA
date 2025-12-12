import { describe, it, expect } from 'vitest';
import { validateValuationInput } from './validation';

describe('validateValuationInput', () => {
    describe('NJOP Validation', () => {
        it('should pass with valid NJOP land value', () => {
            const errors = validateValuationInput({
                njopLandPerM2: 500000,
            });
            expect(errors).toEqual([]);
        });

        it('should fail with NJOP land value too low', () => {
            const errors = validateValuationInput({
                njopLandPerM2: 500,
            });
            expect(errors).toContain('NJOP Tanah harus antara Rp 1,000 - Rp 100,000,000 per m²');
        });

        it('should fail with NJOP land value too high', () => {
            const errors = validateValuationInput({
                njopLandPerM2: 200000000,
            });
            expect(errors).toContain('NJOP Tanah harus antara Rp 1,000 - Rp 100,000,000 per m²');
        });

        it('should pass with valid NJOP building value', () => {
            const errors = validateValuationInput({
                njopBuildingPerM2: 1000000,
            });
            expect(errors).toEqual([]);
        });

        it('should fail with NJOP building value too low', () => {
            const errors = validateValuationInput({
                njopBuildingPerM2: 800,
            });
            expect(errors).toContain('NJOP Bangunan harus antara Rp 1,000 - Rp 100,000,000 per m²');
        });

        it('should pass with NJOP at minimum boundary (1000)', () => {
            const errors = validateValuationInput({
                njopLandPerM2: 1000,
                njopBuildingPerM2: 1000,
            });
            expect(errors).toEqual([]);
        });

        it('should pass with NJOP at maximum boundary (100M)', () => {
            const errors = validateValuationInput({
                njopLandPerM2: 100000000,
                njopBuildingPerM2: 100000000,
            });
            expect(errors).toEqual([]);
        });
    });

    describe('Area Validation', () => {
        it('should pass with valid land area', () => {
            const errors = validateValuationInput({
                landArea: 100,
            });
            expect(errors).toEqual([]);
        });

        it('should fail with zero land area', () => {
            const errors = validateValuationInput({
                landArea: 0,
            });
            expect(errors).toContain('Luas tanah harus minimal 1 m²');
        });

        it('should fail with negative land area', () => {
            const errors = validateValuationInput({
                landArea: -50,
            });
            expect(errors).toContain('Luas tanah harus minimal 1 m²');
        });

        it('should pass with valid building area', () => {
            const errors = validateValuationInput({
                buildingArea: 80,
            });
            expect(errors).toEqual([]);
        });

        it('should fail with zero building area', () => {
            const errors = validateValuationInput({
                buildingArea: 0,
            });
            expect(errors).toContain('Luas bangunan harus minimal 1 m²');
        });

        it('should pass with minimum area (1)', () => {
            const errors = validateValuationInput({
                landArea: 1,
                buildingArea: 1,
            });
            expect(errors).toEqual([]);
        });
    });

    describe('Percentage Validation', () => {
        it('should pass with valid safety margin', () => {
            const errors = validateValuationInput({
                safetyMarginPercent: 10,
            });
            expect(errors).toEqual([]);
        });

        it('should fail with negative safety margin', () => {
            const errors = validateValuationInput({
                safetyMarginPercent: -5,
            });
            expect(errors).toContain('Safety margin harus antara 0-100%');
        });

        it('should fail with safety margin over 100', () => {
            const errors = validateValuationInput({
                safetyMarginPercent: 150,
            });
            expect(errors).toContain('Safety margin harus antara 0-100%');
        });

        it('should pass with valid liquidation factor', () => {
            const errors = validateValuationInput({
                liquidationFactorPercent: 80,
            });
            expect(errors).toEqual([]);
        });

        it('should fail with negative liquidation factor', () => {
            const errors = validateValuationInput({
                liquidationFactorPercent: -10,
            });
            expect(errors).toContain('Faktor likuidasi harus antara 0-100%');
        });

        it('should fail with liquidation factor over 100', () => {
            const errors = validateValuationInput({
                liquidationFactorPercent: 120,
            });
            expect(errors).toContain('Faktor likuidasi harus antara 0-100%');
        });

        it('should pass with percentage at boundaries (0 and 100)', () => {
            const errors = validateValuationInput({
                safetyMarginPercent: 0,
                liquidationFactorPercent: 100,
            });
            expect(errors).toEqual([]);
        });
    });

    describe('Multiple Errors', () => {
        it('should return multiple errors for multiple invalid fields', () => {
            const errors = validateValuationInput({
                njopLandPerM2: 500,
                landArea: -10,
                safetyMarginPercent: 150,
            });
            expect(errors).toHaveLength(3);
            expect(errors).toContain('NJOP Tanah harus antara Rp 1,000 - Rp 100,000,000 per m²');
            expect(errors).toContain('Luas tanah harus minimal 1 m²');
            expect(errors).toContain('Safety margin harus antara 0-100%');
        });

        it('should return all 6 possible errors', () => {
            const errors = validateValuationInput({
                njopLandPerM2: 100,
                njopBuildingPerM2: 200000000,
                landArea: -5,
                buildingArea: 0,
                safetyMarginPercent: -10,
                liquidationFactorPercent: 150,
            });
            expect(errors).toHaveLength(6);
        });
    });

    describe('Edge Cases', () => {
        it('should return empty array for empty input', () => {
            const errors = validateValuationInput({});
            expect(errors).toEqual([]);
        });

        it('should handle undefined values', () => {
            const errors = validateValuationInput({
                njopLandPerM2: undefined,
                landArea: undefined,
            });
            expect(errors).toEqual([]);
        });

        it('should handle null values', () => {
            const errors = validateValuationInput({
                njopLandPerM2: null,
                landArea: null,
            });
            expect(errors).toEqual([]);
        });

        it('should pass with all valid values', () => {
            const errors = validateValuationInput({
                njopLandPerM2: 500000,
                njopBuildingPerM2: 800000,
                landArea: 100,
                buildingArea: 80,
                safetyMarginPercent: 10,
                liquidationFactorPercent: 80,
            });
            expect(errors).toEqual([]);
        });
    });
});
