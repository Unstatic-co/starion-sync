import { Logger } from '@nestjs/common';

export class Utils {
  private static readonly logger = new Logger(Utils.name);

  /**
   * Get random element from array
   * @param {any[]} array
   * @return {any}
   */
  public static getRandom(array: any[]) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Wait
   * @param {number} ms
   * @return {Promise}
   */
  public static wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Retry a promoise function
   * @param {any} operation
   * @param {number} retries
   * @param {number} delay
   * @return {Promise<any>}
   */
  public static retryFn(operation, retries = 3, delay = 500) {
    return new Promise((resolve, reject) => {
      return operation()
        .then(resolve)
        .catch((reason) => {
          if (retries > 0) {
            return Utils.wait(delay)
              .then(this.retryFn.bind(null, operation, retries - 1, delay))
              .then(resolve)
              .catch(reject);
          }
          return reject(reason);
        });
    });
  }

  /**
   * the async version of arr.filter
   * @param {Array} arr
   * @param {Function} predicate
   * @return {Array}
   */
  public static async asyncFilter(arr, predicate) {
    const results = await Promise.all(arr.map(predicate));
    return arr.filter((_v, index) => results[index]);
  }

  /**
   * Convert string to bytes
   * @param {string} str
   * @return {string}
   */
  public static convertToBytes(str: string) {
    return '0x' + str;
  }

  /**
   * Convert bytes to bytes
   * @param {string} str
   * @return {string}
   */
  public static convertBytesToString(str: string) {
    return str.substring(2);
  }

  public static isEmpty(str) {
    return !str || str.length === 0;
  }

  public static isParamExists(param) {
    return param !== undefined ? true : false;
  }
}
