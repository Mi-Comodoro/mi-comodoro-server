import { getErrorMessage } from '../error.helpers';

describe('getErrorMessage', () => {
  it('returns message from an Error instance', () => {
    expect(getErrorMessage(new Error('something failed'))).toBe('something failed');
  });

  it('returns the string directly when error is a string', () => {
    expect(getErrorMessage('plain string error')).toBe('plain string error');
  });

  it('returns message from an error-like object', () => {
    expect(getErrorMessage({ message: 'object message' })).toBe('object message');
  });

  it('returns JSON stringified value for a plain object without message', () => {
    expect(getErrorMessage({ code: 404, reason: 'not found' })).toBe(
      '{"code":404,"reason":"not found"}',
    );
  });

  it('returns "Unknown error" for circular reference objects', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(getErrorMessage(circular)).toBe('Unknown error');
  });

  it('returns JSON for a number', () => {
    expect(getErrorMessage(500)).toBe('500');
  });

  it('returns "null" for null input', () => {
    expect(getErrorMessage(null)).toBe('null');
  });

  it('returns "true" for boolean true', () => {
    expect(getErrorMessage(true)).toBe('true');
  });

  it('does not use message property when it is not a string', () => {
    expect(getErrorMessage({ message: 42 })).toBe('{"message":42}');
  });
});
