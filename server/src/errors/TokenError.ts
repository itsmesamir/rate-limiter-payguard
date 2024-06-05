import HttpStatus from 'http-status-codes';
import BaseError from './BaseError';

class TokenError extends BaseError {
  constructor(
    message: string = HttpStatus.getStatusText(HttpStatus.UNAUTHORIZED)
  ) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export default TokenError;
