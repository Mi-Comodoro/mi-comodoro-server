import { pathOnly } from '../log-url';

describe('pathOnly', () => {
  it('quita la query string, que puede llevar teléfonos o búsquedas', () => {
    expect(pathOnly('/api/v1/users/check-phone?phone=%2B573001234567')).toBe(
      '/api/v1/users/check-phone',
    );
    expect(pathOnly('/api/v1/users/search?q=ana@example.com&limit=5')).toBe('/api/v1/users/search');
  });

  it('deja intacta una ruta sin query', () => {
    expect(pathOnly('/api/v1/budgets/3f6b1c2a-0000-4000-8000-000000000000')).toBe(
      '/api/v1/budgets/3f6b1c2a-0000-4000-8000-000000000000',
    );
  });

  it('tolera valores vacíos', () => {
    expect(pathOnly(undefined)).toBe('');
    expect(pathOnly(null)).toBe('');
    expect(pathOnly('')).toBe('');
  });
});
