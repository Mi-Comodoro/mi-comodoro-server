import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Falta la autorización de tratamiento de datos para crear la cuenta.
 *
 * No extiende BadRequestException a propósito: el filtro global responde con el nombre de la clase
 * (error: 'ConsentRequired'), un código estable que el frontend usa para mostrar la casilla en lugar
 * de un error genérico.
 */
export class ConsentRequiredException extends HttpException {
  constructor(policyVersion: string) {
    super(
      `Debes aceptar la Política de Tratamiento de Datos (versión ${policyVersion}) para crear tu cuenta.`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
