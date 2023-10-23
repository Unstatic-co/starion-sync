export interface AcceptableErrorData {
  [key: string]: any;
  isAlreadySucceeded?: boolean;
}

export class UnacceptableError extends Error {
  constructor(message) {
    super(message);
  }
}

export class AcceptableError extends Error {
  data?: AcceptableErrorData;
  constructor(message, data?: AcceptableErrorData) {
    super(message);
    this.data = data;
  }

  // public getMetadata() {
  // return this.metadata;
  // }

  // public getReason() {
  // return this.metadata?.reason;
  // }

  public getData() {
    return this.data;
  }
}
