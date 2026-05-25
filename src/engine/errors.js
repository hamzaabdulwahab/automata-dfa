export class AutomatonError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AutomatonError';
  }
}

export class ValidationError extends AutomatonError {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class EvaluationError extends AutomatonError {
  constructor(message) {
    super(message);
    this.name = 'EvaluationError';
  }
}
