export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export class ConnectionError extends Error {
  constructor(message = 'Die Verbindung ist unterbrochen. Bitte versuche es erneut.') { super(message); }
}
