import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * 
 * Uses DOMPurify to clean potentially dangerous HTML/scripts from user input
 * while preserving safe HTML formatting.
 * 
 * @param dirty - Potentially unsafe HTML string
 * @returns Sanitized safe HTML string
 * 
 * @example
 * ```typescript
 * const userInput = '<script>alert("XSS")</script>Hello';
 * const safe = sanitizeHtml(userInput);
 * // Returns: 'Hello' (script removed)
 * ```
 */
export function sanitizeHtml(dirty: string): string {
    if (!dirty || typeof dirty !== 'string') {
        return '';
    }

    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: [],
    });
}

/**
 * Sanitizes plain text by escaping HTML special characters
 * 
 * Converts HTML special characters to their entity equivalents to prevent
 * injection attacks in plain text contexts.
 * 
 * @param text - Plain text that may contain HTML characters
 * @returns Escaped safe text
 * 
 * @example
 * ```typescript
 * const text = '<script>alert("XSS")</script>';
 * const safe = sanitizeText(text);
 * // Returns: '&lt;script&gt;alert("XSS")&lt;/script&gt;'
 * ```
 */
export function sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes user input object by cleaning all string values
 * 
 * Recursively sanitizes all string values in an object to prevent XSS.
 * Useful for sanitizing form data or API request bodies.
 * 
 * @param obj - Object with potentially unsafe string values
 * @returns New object with sanitized string values
 * 
 * @example
 * ```typescript
 * const input = {
 *   name: '<script>alert("XSS")</script>John',
 *   age: 30,
 *   notes: 'Safe text'
 * };
 * const safe = sanitizeObject(input);
 * // Returns: { name: 'John', age: 30, notes: 'Safe text' }
 * ```
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const sanitized = { ...obj };

    for (const key in sanitized) {
        const value = sanitized[key];

        if (typeof value === 'string') {
            sanitized[key] = sanitizeText(value) as any;
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        }
    }

    return sanitized;
}
