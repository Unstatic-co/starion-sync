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

export type GetRangeResponse = {
  address: string;
  addressLocal: string;
  columnCount: number;
  cellCount: number;
  columnHidden: boolean;
  rowHidden: boolean;
  numberFormat: any[][];
  columnIndex: number;
  text: any[][];
  formulas: any[][];
  furmulasLocal: any[][];
  formulasR1C1: any[][];
  hidden: boolean;
  rowCount: number;
  rowIndex: number;
  valueTypes: any[][];
  values: any[][];
};
