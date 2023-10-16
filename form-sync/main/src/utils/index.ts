import * as md5 from 'md5';
import * as moment from 'moment-timezone';

export class Utils {
  static hashFieldName(fieldName: string): string {
    return `f_${md5(fieldName)}`;
  }

  static md5(str: string): string {
    return md5(str);
  }

  static convertToExcelColumnName(columnNumber: number): string {
    let columnName = '';
    const base = 26; // Excel uses base-26 (A-Z) for column names

    while (columnNumber >= 0) {
      const remainder = columnNumber % base;
      columnName = String.fromCharCode(remainder + 65) + columnName;
      columnNumber = Math.floor(columnNumber / base) - 1;
    }

    return columnName;
  }

  static createCronExpressionFromFrequency(minutes: number): string {
    const randomSeconds = Math.floor(Math.random() * 60);
    const randomMinutes = Math.floor(Math.random() * minutes);

    return `${randomSeconds} ${randomMinutes}/${minutes} * * * *`;
  }

  static convertDateToSerialNumber(date: Date, timezone: string): number {
    const timezoneOffset = moment.tz(timezone).utcOffset();
    return (
      25569.0 +
      (date.getTime() + timezoneOffset * 60 * 1000) / (1000 * 60 * 60 * 24)
    );
  }
}
