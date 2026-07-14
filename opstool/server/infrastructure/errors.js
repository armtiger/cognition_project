export class ApiError extends Error {
  constructor(status, message, code = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg, code) => new ApiError(400, msg, code);
export const forbidden = (msg, code) => new ApiError(403, msg, code);
export const notFound = (msg, code) => new ApiError(404, msg, code);
export const conflict = (msg, code) => new ApiError(409, msg, code);
