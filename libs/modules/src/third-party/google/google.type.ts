export type GaxiosError = {
  config: {
    method: string;
    url: string;
    data: any;
    headers: {
      [index: string]: any;
    };
    body: any;
    responseType: string;
  };
  response: {
    config: {
      method: string;
      url: string;
      data: any;
      headers: {
        [index: string]: any;
      };
      body: any;
      responseType: string;
    };
    data: {
      error: any;
      error_description?: string;
    };
    headers: object;
    status: number;
    statusText: string;
    request: any;
  };
  code: number;
};

export interface GetUserInfoResponse {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  locale: string;
}
