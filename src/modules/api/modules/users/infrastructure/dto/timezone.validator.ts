import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'IsValidTimezone', async: false })
export class IsValidTimezone implements ValidatorConstraintInterface {
  validate(tz: string) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'Zona horaria no válida';
  }
}
