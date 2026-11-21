import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * El registro es solo por invitación durante la beta cerrada.
 *
 * No extiende ForbiddenException a propósito: el filtro global responde con el nombre de la clase
 * (error: 'BetaInviteRequired'), un código estable que el frontend usa para explicar cómo pedir acceso.
 */
export class BetaInviteRequiredException extends HttpException {
  constructor() {
    super(
      'El registro es solo por invitación durante la beta cerrada. Pide acceso en micomodoro.com.',
      HttpStatus.FORBIDDEN,
    );
  }
}
