export const ERROR_RESPONSES: Record<number, { message: string; error: string }> = {
  400: { message: 'Bad request', error: 'BadRequest' },
  401: { message: 'Unauthorized', error: 'Unauthorized' },
  403: { message: 'Forbidden', error: 'Forbidden' },
  404: { message: 'Resource not found', error: 'NotFound' },
  409: { message: 'Conflict', error: 'Conflict' },
  422: { message: 'Unprocessable entity', error: 'UnprocessableEntity' },
  500: { message: 'Internal server error', error: 'InternalServerError' },
};
