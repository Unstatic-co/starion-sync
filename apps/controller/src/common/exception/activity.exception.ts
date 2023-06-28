export interface AcitivityErrorData {
  [key: string]: any;
}

export interface AcceptableActivityErrorData extends AcitivityErrorData {
  isAlreadySucceeded?: boolean;
}
const defaultAcceptableActivityErrorData: AcceptableActivityErrorData = {};
export interface UnacceptableActivityErrorData extends AcitivityErrorData {
  shouldActivityRetry?: boolean;
  shouldWorkflowFail?: boolean;
}
const defaultUnacceptableActivityErrorData: UnacceptableActivityErrorData = {
  shouldActivityRetry: false,
  shouldWorkflowFail: true,
};

export class ActivityError extends Error {
  data?: AcitivityErrorData;

  constructor(message, data?: AcitivityErrorData) {
    super(message);
    this.data = data;
  }
}
export class UnacceptableActivityError extends ActivityError {
  data?: UnacceptableActivityErrorData;
  constructor(message, data?: UnacceptableActivityErrorData) {
    if (!data) {
      data = defaultUnacceptableActivityErrorData;
    }
    super(message, data);
  }
}

export class AcceptableActivityError extends ActivityError {
  data?: AcceptableActivityErrorData;
  constructor(message, data?: AcceptableActivityErrorData) {
    if (!data) {
      data = defaultAcceptableActivityErrorData;
    }
    super(message, data);
  }
}
