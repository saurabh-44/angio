export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details) {
    return new HttpError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Unauthorized') {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'Forbidden') {
    return new HttpError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Not found') {
    return new HttpError(404, 'NOT_FOUND', message);
  }
  static conflict(message = 'Conflict') {
    return new HttpError(409, 'CONFLICT', message);
  }
  static unprocessable(message = 'Unprocessable', code = 'UNPROCESSABLE') {
    return new HttpError(422, code, message);
  }
  static tooMany(message = 'Too many requests') {
    return new HttpError(429, 'TOO_MANY_REQUESTS', message);
  }
  static locked(message = 'Account temporarily locked') {
    return new HttpError(423, 'LOCKED', message);
  }
  static server(message = 'Internal server error') {
    return new HttpError(500, 'INTERNAL_ERROR', message);
  }
}
