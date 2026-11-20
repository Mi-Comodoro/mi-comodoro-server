/**
 * Ruta de la petición sin la query string, para registrarla en los logs.
 *
 * La query puede llevar datos personales (p. ej. /users/check-phone?phone=... o /users/search?q=...),
 * y los logs no deben contenerlos. La ruta sola basta para depurar.
 */
export const pathOnly = (url?: string | null): string => (url ?? '').split('?')[0];
