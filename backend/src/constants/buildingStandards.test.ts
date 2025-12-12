import { describe, it, expect } from 'vitest';
import {
    getBuildingStandard,
    getDepreciationPercentForAge,
    computeBuildingValuation,
    buildingStandards,
    BuildingStandardCode,
} from './buildingStandards';

describe('Building Standards', () => {
    describe('getBuildingStandard', () => {
        it('should return standard for valid code', () => {
            const standard = getBuildingStandard('house_one_story_type_a');
            expect(standard).toBeDefined();
            expect(standard?.code).toBe('house_one_story_type_a');
            expect(standard?.baseRate).toBe(2_900_000);
        });

        it('should return undefined for invalid code', () => {
            const standard = getBuildingStandard('invalid_code' as BuildingStandardCode);
            expect(standard).toBeUndefined();
        });

        it('should return correct two-story standard', () => {
            const standard = getBuildingStandard('house_two_story_type_a');
            expect(standard).toBeDefined();
            expect(standard?.floors).toBe(2);
            expect(standard?.baseRate).toBe(3_500_000);
        });

        it('should return correct simple house standard', () => {
            const standard = getBuildingStandard('house_one_story_simple_type_a');
            expect(standard).toBeDefined();
            expect(standard?.category).toBe('rumah_sederhana');
            expect(standard?.baseRate).toBe(2_000_000);
        });
    });

    describe('getDepreciationPercentForAge', () => {
        it('should return 5% for age 0-5 years', () => {
            expect(getDepreciationPercentForAge(0)).toBe(5);
            expect(getDepreciationPercentForAge(3)).toBe(5);
            expect(getDepreciationPercentForAge(5)).toBe(15); // Boundary: 5 years goes to next bracket
        });

        it('should return 15% for age 5-10 years', () => {
            expect(getDepreciationPercentForAge(5)).toBe(15);
            expect(getDepreciationPercentForAge(7)).toBe(15);
            expect(getDepreciationPercentForAge(9)).toBe(15);
        });

        it('should return 25% for age 10-20 years', () => {
            expect(getDepreciationPercentForAge(10)).toBe(25);
            expect(getDepreciationPercentForAge(15)).toBe(25);
            expect(getDepreciationPercentForAge(19)).toBe(25);
        });

        it('should return 50% for age 20+ years', () => {
            expect(getDepreciationPercentForAge(20)).toBe(50);
            expect(getDepreciationPercentForAge(30)).toBe(50);
            expect(getDepreciationPercentForAge(100)).toBe(50);
        });

        it('should handle edge cases', () => {
            expect(getDepreciationPercentForAge(-5)).toBe(0); // Negative age
            expect(getDepreciationPercentForAge(NaN)).toBe(0); // NaN
        });

        it('should handle boundary values correctly', () => {
            expect(getDepreciationPercentForAge(4.9)).toBe(5);
            expect(getDepreciationPercentForAge(5.0)).toBe(15);
            expect(getDepreciationPercentForAge(9.9)).toBe(15);
            expect(getDepreciationPercentForAge(10.0)).toBe(25);
        });
    });

    describe('computeBuildingValuation', () => {
        const currentYear = new Date().getFullYear();

        it('should compute valuation without depreciation for new building', () => {
            const result = computeBuildingValuation({
                standardCode: 'house_one_story_type_a',
            });

            expect(result.standard.code).toBe('house_one_story_type_a');
            expect(result.standardRate).toBe(2_900_000);
            expect(result.depreciationPercent).toBe(0);
            expect(result.adjustedRate).toBe(2_900_000);
        });

        it('should compute valuation with depreciation for 3-year-old building', () => {
            const yearBuilt = currentYear - 3;
            const result = computeBuildingValuation({
                standardCode: 'house_one_story_type_a',
                yearBuilt,
            });

            expect(result.depreciationPercent).toBe(5);
            expect(result.adjustedRate).toBe(Math.round(2_900_000 * 0.95)); // 5% depreciation
            expect(result.adjustedRate).toBe(2_755_000);
        });

        it('should compute valuation with 15% depreciation for 7-year-old building', () => {
            const yearBuilt = currentYear - 7;
            const result = computeBuildingValuation({
                standardCode: 'house_two_story_type_a',
                yearBuilt,
            });

            expect(result.depreciationPercent).toBe(15);
            expect(result.adjustedRate).toBe(Math.round(3_500_000 * 0.85)); // 15% depreciation
            expect(result.adjustedRate).toBe(2_975_000);
        });

        it('should compute valuation with 25% depreciation for 15-year-old building', () => {
            const yearBuilt = currentYear - 15;
            const result = computeBuildingValuation({
                standardCode: 'house_one_story_type_b',
                yearBuilt,
            });

            expect(result.depreciationPercent).toBe(25);
            expect(result.adjustedRate).toBe(Math.round(2_600_000 * 0.75)); // 25% depreciation
            expect(result.adjustedRate).toBe(1_950_000);
        });

        it('should compute valuation with 50% depreciation for 25-year-old building', () => {
            const yearBuilt = currentYear - 25;
            const result = computeBuildingValuation({
                standardCode: 'house_one_story_simple_type_a',
                yearBuilt,
            });

            expect(result.depreciationPercent).toBe(50);
            expect(result.adjustedRate).toBe(Math.round(2_000_000 * 0.5)); // 50% depreciation
            expect(result.adjustedRate).toBe(1_000_000);
        });

        it('should use custom appraisal date for age calculation', () => {
            const result = computeBuildingValuation({
                standardCode: 'house_one_story_type_a',
                yearBuilt: 2015,
                appraisalDate: '2020-01-01',
            });

            // Age = 2020 - 2015 = 5 years
            expect(result.depreciationPercent).toBe(15); // 5 years = 15%
        });

        it('should throw error for invalid standard code', () => {
            expect(() => {
                computeBuildingValuation({
                    standardCode: 'invalid_code' as BuildingStandardCode,
                });
            }).toThrow('Standar bangunan tidak ditemukan');
        });

        it('should handle year built in future gracefully', () => {
            const yearBuilt = currentYear + 5;
            const result = computeBuildingValuation({
                standardCode: 'house_one_story_type_a',
                yearBuilt,
            });

            // Age should be 0 (Math.max prevents negative)
            expect(result.depreciationPercent).toBe(0);
            expect(result.adjustedRate).toBe(2_900_000);
        });
    });

    describe('Building Standards Data Integrity', () => {
        it('should have all 11 building standards', () => {
            expect(buildingStandards).toHaveLength(11);
        });

        it('should have valid base rates for all standards', () => {
            buildingStandards.forEach(standard => {
                expect(standard.baseRate).toBeGreaterThan(0);
                expect(standard.baseRate).toBeLessThanOrEqual(10_000_000);
            });
        });

        it('should have valid floor counts', () => {
            buildingStandards.forEach(standard => {
                expect([1, 2]).toContain(standard.floors);
            });
        });

        it('should have unique codes', () => {
            const codes = buildingStandards.map(s => s.code);
            const uniqueCodes = new Set(codes);
            expect(uniqueCodes.size).toBe(buildingStandards.length);
        });

        it('should have specifications for all standards', () => {
            buildingStandards.forEach(standard => {
                expect(standard.specification).toBeDefined();
                expect(standard.specification.length).toBeGreaterThan(0);
            });
        });
    });
});
