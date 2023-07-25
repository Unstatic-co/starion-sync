export type GetFileInfoResponse = {
  createdDateTime: Date;
  cTag: string;
  eTag: string;
  id: string;
  lastModifiedDateTime: Date;
  name: string;
  size: string;
  webUrl: string;
  reactions: object;
  createdBy: object;
  lastModifiedBy: object;
  parentReference: object;
  file: object;
  fileSystemInfo: object;
};
