import { describe, it, expect } from 'vitest';
import { validateEmail, validatePhoneNumber } from './validation';

describe('Email Validation', () => {
    describe('Valid Emails', () => {
        it('should accept standard email', () => {
            expect(validateEmail('user@example.com')).toBe(true);
        });

        it('should accept email with subdomain', () => {
            expect(validateEmail('user@mail.example.com')).toBe(true);
        });

        it('should accept email with plus sign', () => {
            expect(validateEmail('user+tag@example.com')).toBe(true);
        });

        it('should accept email with dots', () => {
            expect(validateEmail('user.name@example.com')).toBe(true);
        });

        it('should accept email with numbers', () => {
            expect(validateEmail('user123@example.com')).toBe(true);
        });

        it('should trim whitespace', () => {
            expect(validateEmail('  user@example.com  ')).toBe(true);
        });
    });

    describe('Invalid Emails', () => {
        it('should reject email without @', () => {
            expect(validateEmail('userexample.com')).toBe(false);
        });

        it('should reject email without domain', () => {
            expect(validateEmail('user@')).toBe(false);
        });

        it('should reject email without TLD', () => {
            expect(validateEmail('user@example')).toBe(false);
        });

        it('should reject email with spaces', () => {
            expect(validateEmail('user name@example.com')).toBe(false);
        });

        it('should reject empty string', () => {
            expect(validateEmail('')).toBe(false);
        });

        it('should reject null/undefined', () => {
            expect(validateEmail(null as any)).toBe(false);
            expect(validateEmail(undefined as any)).toBe(false);
        });
    });
});

describe('Phone Number Validation', () => {
    describe('Valid Indonesian Mobile Numbers', () => {
        it('should accept 08xx format (10 digits)', () => {
            expect(validatePhoneNumber('0812345678')).toBe(true);
        });

        it('should accept 08xx format (11 digits)', () => {
            expect(validatePhoneNumber('08123456789')).toBe(true);
        });

        it('should accept 08xx format (12 digits)', () => {
            expect(validatePhoneNumber('081234567890')).toBe(true);
        });

        it('should accept +628xx format', () => {
            expect(validatePhoneNumber('+628123456789')).toBe(true);
        });

        it('should accept 628xx format', () => {
            expect(validatePhoneNumber('628123456789')).toBe(true);
        });

        it('should accept phone with spaces', () => {
            expect(validatePhoneNumber('0812 3456 7890')).toBe(true);
        });

        it('should accept phone with dashes', () => {
            expect(validatePhoneNumber('0812-3456-7890')).toBe(true);
        });
    });

    describe('Valid Indonesian Landline Numbers', () => {
        it('should accept 021 format (Jakarta)', () => {
            expect(validatePhoneNumber('0217654321')).toBe(true);
        });

        it('should accept 022 format (Bandung)', () => {
            expect(validatePhoneNumber('0224567890')).toBe(true);
        });

        it('should accept +6221 format', () => {
            expect(validatePhoneNumber('+62217654321')).toBe(true);
        });
    });

    describe('Invalid Phone Numbers', () => {
        it('should reject too short number', () => {
            expect(validatePhoneNumber('081234')).toBe(false);
        });

        it('should reject wrong prefix', () => {
            expect(validatePhoneNumber('0712345678')).toBe(false);
        });

        it('should reject letters', () => {
            expect(validatePhoneNumber('08abc123456')).toBe(false);
        });

        it('should reject empty string', () => {
            expect(validatePhoneNumber('')).toBe(false);
        });

        it('should reject null/undefined', () => {
            expect(validatePhoneNumber(null as any)).toBe(false);
            expect(validatePhoneNumber(undefined as any)).toBe(false);
        });

        it('should reject international non-Indonesian', () => {
            expect(validatePhoneNumber('+1234567890')).toBe(false);
        });
    });
});
