/** Se emite cuando las sesiones de un usuario quedan invalidadas (p. ej. logout). */
export const SESSION_INVALIDATED_EVENT = 'auth.session.invalidated';

export interface SessionInvalidatedPayload {
  userId: string;
}
