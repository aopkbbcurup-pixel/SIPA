import { describe, it, expect } from 'vitest';
import { NotFoundError, UnauthorizedError, ValidationError } from './errors';

describe('Custom Error Classes', () => {
    describe('NotFoundError', () => {
        it('should create error with message', () => {
            const error = new NotFoundError('Item not found');
            expect(error.message).toBe('Item not found');
            expect(error.name).toBe('NotFoundError');
            expect(error).toBeInstanceOf(Error);
        });

        it('should have correct name property', () => {
            const error = new NotFoundError('Test');
            expect(error.name).toBe('NotFoundError');
        });

        it('should be instance of Error', () => {
            const error = new NotFoundError('Test');
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(NotFoundError);
        });
    });

    describe('UnauthorizedError', () => {
        it('should create error with message', () => {
            const error = new UnauthorizedError('Access denied');
            expect(error.message).toBe('Access denied');
            expect(error.name).toBe('UnauthorizedError');
        });

        it('should have correct name property', () => {
            const error = new UnauthorizedError('Test');
            expect(error.name).toBe('UnauthorizedError');
        });

        it('should be instance of Error', () => {
            const error = new UnauthorizedError('Test');
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(UnauthorizedError);
        });
    });

    describe('ValidationError', () => {
        it('should create error with message', () => {
            const error = new ValidationError('Invalid input');
            expect(error.message).toBe('Invalid input');
            expect(error.name).toBe('ValidationError');
        });

        it('should have correct name property', () => {
            const error = new ValidationError('Test');
            expect(error.name).toBe('ValidationError');
        });

        it('should be instance of Error', () => {
            const error = new ValidationError('Test');
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ValidationError);
        });
    });

    describe('Error Differentiation', () => {
        it('should differentiate between error types', () => {
            const notFound = new NotFoundError('Not found');
            const unauthorized = new UnauthorizedError('Unauthorized');
            const validation = new ValidationError('Validation');

            expect(notFound).toBeInstanceOf(NotFoundError);
            expect(notFound).not.toBeInstanceOf(UnauthorizedError);
            expect(notFound).not.toBeInstanceOf(ValidationError);

            expect(unauthorized).toBeInstanceOf(UnauthorizedError);
            expect(unauthorized).not.toBeInstanceOf(NotFoundError);
            expect(unauthorized).not.toBeInstanceOf(ValidationError);

            expect(validation).toBeInstanceOf(ValidationError);
            expect(validation).not.toBeInstanceOf(NotFoundError);
            expect(validation).not.toBeInstanceOf(UnauthorizedError);
        });
    });

    describe('Error Stack Trace', () => {
        it('should have stack trace', () => {
            const error = new NotFoundError('Test');
            expect(error.stack).toBeDefined();
            expect(error.stack).toContain('NotFoundError');
        });
    });
});
