import { corsOriginResolver, isOriginAllowed } from '../allowed-origins';

describe('allowed-origins', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('permite peticiones sin cabecera Origin en cualquier entorno', () => {
    process.env.NODE_ENV = 'production';
    expect(isOriginAllowed(undefined)).toBe(true);
  });

  it.each(['local', 'development'])('permite cualquier origen en %s', (env) => {
    process.env.NODE_ENV = env;
    delete process.env.FRONTEND_URL;
    expect(isOriginAllowed('https://cualquier-sitio.example')).toBe(true);
  });

  describe('production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://staging.micomodoro.com, https://otro.micomodoro.com';
    });

    it('permite dominios productivos y los de FRONTEND_URL', () => {
      expect(isOriginAllowed('https://app.micomodoro.com')).toBe(true);
      expect(isOriginAllowed('https://staging.micomodoro.com')).toBe(true);
      expect(isOriginAllowed('https://otro.micomodoro.com')).toBe(true);
    });

    it('rechaza orígenes fuera de la lista blanca', () => {
      expect(isOriginAllowed('https://evil.example')).toBe(false);
    });

    it('lee FRONTEND_URL en cada petición, no al importar el módulo', () => {
      process.env.FRONTEND_URL = 'https://nuevo.micomodoro.com';
      expect(isOriginAllowed('https://nuevo.micomodoro.com')).toBe(true);
    });
  });

  it('corsOriginResolver delega en isOriginAllowed', () => {
    process.env.NODE_ENV = 'production';
    const callback = jest.fn();
    corsOriginResolver('https://evil.example', callback);
    expect(callback).toHaveBeenCalledWith(null, false);
  });
});
