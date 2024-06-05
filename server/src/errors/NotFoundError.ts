import BaseError from './BaseError';
import HttpStatus from 'http-status-codes';

class NotFoundError extends BaseError {
  constructor(
    message: string = HttpStatus.getStatusText(HttpStatus.NOT_FOUND)
  ) {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export default NotFoundError;
