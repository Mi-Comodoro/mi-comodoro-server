import { ERROR_RESPONSES } from '../errors.constants';

export const getError = (statusCode: number) => {
  const { message, error } = ERROR_RESPONSES[statusCode] ?? { message: 'Error', error: 'Error' };
  return { message, error };
};
export const errorExample = (message: string, statusCode: number) => {
  const { error, message: errorMessage } = getError(statusCode);
  const currentMessage = message ? message : errorMessage;
  return {
    success: false,
    message: currentMessage,
    statusCode,
    error,
  };
};
