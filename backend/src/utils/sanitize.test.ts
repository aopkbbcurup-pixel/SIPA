import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeText, sanitizeObject } from './sanitize';

describe('Input Sanitization', () => {
    describe('sanitizeHtml', () => {
        it('should remove script tags', () => {
            const dirty = '<script>alert("XSS")</script>Hello';
            const clean = sanitizeHtml(dirty);
            expect(clean).toBe('Hello');
            expect(clean).not.toContain('script');
        });

        it('should allow safe HTML tags', () => {
            const dirty = '<p><strong>Bold</strong> and <em>italic</em></p>';
            const clean = sanitizeHtml(dirty);
            expect(clean).toContain('<strong>');
            expect(clean).toContain('<em>');
        });

        it('should remove event handlers', () => {
            const dirty = '<p onclick="alert(\'XSS\')">Click me</p>';
            const clean = sanitizeHtml(dirty);
            expect(clean).not.toContain('onclick');
            expect(clean).toContain('Click me');
        });

        it('should remove javascript: URLs', () => {
            const dirty = '<a href="javascript:alert(\'XSS\')">Link</a>';
            const clean = sanitizeHtml(dirty);
            expect(clean).not.toContain('javascript:');
        });

        it('should handle empty input', () => {
            expect(sanitizeHtml('')).toBe('');
            expect(sanitizeHtml(null as any)).toBe('');
            expect(sanitizeHtml(undefined as any)).toBe('');
        });
    });

    describe('sanitizeText', () => {
        it('should escape HTML special characters', () => {
            const text = '<script>alert("XSS")</script>';
            const safe = sanitizeText(text);
            expect(safe).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
        });

        it('should escape ampersands', () => {
            const text = 'Tom & Jerry';
            const safe = sanitizeText(text);
            expect(safe).toBe('Tom &amp; Jerry');
        });

        it('should escape quotes', () => {
            const text = 'He said "Hello"';
            const safe = sanitizeText(text);
            expect(safe).toContain('&quot;');
        });

        it('should escape single quotes', () => {
            const text = "It's working";
            const safe = sanitizeText(text);
            expect(safe).toContain('&#x27;');
        });

        it('should handle empty text', () => {
            expect(sanitizeText('')).toBe('');
            expect(sanitizeText(null as any)).toBe('');
        });
    });

    describe('sanitizeObject', () => {
        it('should sanitize string values', () => {
            const obj = {
                name: '<script>alert("XSS")</script>John',
                age: 30,
            };
            const safe = sanitizeObject(obj);
            expect(safe.name).not.toContain('<script>');
            expect(safe.age).toBe(30);
        });

        it('should recursively sanitize nested objects', () => {
            const obj = {
                user: {
                    name: '<script>XSS</script>Jane',
                    bio: 'Safe text',
                },
            };
            const safe = sanitizeObject(obj);
            expect(safe.user.name).not.toContain('<script>');
            expect(safe.user.bio).toBe('Safe text');
        });

        it('should handle arrays', () => {
            const obj = {
                tags: ['<script>XSS</script>', 'safe', '<b>bold</b>'],
            };
            const safe = sanitizeObject(obj);
            expect(safe.tags[0]).not.toContain('<script>');
        });

        it('should preserve numbers and booleans', () => {
            const obj = {
                count: 42,
                active: true,
                text: '<script>XSS</script>',
            };
            const safe = sanitizeObject(obj);
            expect(safe.count).toBe(42);
            expect(safe.active).toBe(true);
            expect(safe.text).not.toContain('<script>');
        });

        it('should handle null and undefined', () => {
            expect(sanitizeObject(null as any)).toBe(null);
            expect(sanitizeObject(undefined as any)).toBe(undefined);
        });
    });

    describe('XSS Attack Vectors', () => {
        it('should prevent common XSS vectors', () => {
            const vectors = [
                '<img src=x onerror=alert(1)>',
                '<svg onload=alert(1)>',
                '<iframe src="javascript:alert(1)">',
                '<body onload=alert(1)>',
                '<input onfocus=alert(1) autofocus>',
            ];

            vectors.forEach(vector => {
                const clean = sanitizeHtml(vector);
                expect(clean).not.toContain('alert');
                expect(clean).not.toContain('onerror');
                expect(clean).not.toContain('onload');
                expect(clean).not.toContain('onfocus');
            });
        });
    });
});
