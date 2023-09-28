import { Logger } from '@nestjs/common';
import ObjectID from 'bson-objectid';
import { Types } from 'mongoose';
const CryptoJS = require('crypto-js');
import mongoose from 'mongoose';
const jwt = require('jsonwebtoken');
import * as bcrypt from 'bcrypt';

export class Utils {
  private static readonly logger = new Logger(Utils.name);

  /**
   * Get user from header
   * @param {Request} req
   * @return {UserJWT}
   */
  public static async getUser(req: Request) {
    try {
      if (
        req.headers['authorization'] &&
        req.headers['authorization'].split(' ')[0] === 'Bearer'
      ) {
        const jwtToken = req.headers['authorization'].split(' ')[1];
        return jwt.verify(jwtToken, process.env.JWT_SECRET);
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Check string is Mongo ObjectId
   * @param {string} str
   * @return {boolean}
   */
  public static isObjectId(str: string) {
    try {
      new Types.ObjectId(str);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert string to Mongo ObjectId
   * @param {any} str
   * @return {Types.ObjectId}
   */
  public static toObjectId(str: any) {
    return new Types.ObjectId(str);
  }

  /**
   * Create mongodb id
   * @return {Types.ObjectId}
   */
  public static createObjectId() {
    return new Types.ObjectId(new ObjectID());
  }

  /**
   * Convert array string to array Mongo ObjectId
   * @param {string[]} strs
   * @return {Types.ObjectId[]}
   */
  public static toObjectIds(strs: string[]) {
    return strs.map((str) => this.toObjectId(str));
  }

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
   * Encrypt
   * @param {string} str
   * @return {string}
   */
  public static encrypt(str) {
    return CryptoJS.AES.encrypt(str, process.env.CRYPTO_SECRET).toString();
  }

  /**
   * Decrypt
   * @param {string} ciphertext
   * @return {string}
   */
  public static decrypt(ciphertext) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.CRYPTO_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Paginate
   * @param {any} model
   * @param {any} match
   * @param {any} query
   * @return {Promise<any>}
   */
  public static paginate(model: any, match: any, query: any) {
    this.logger.debug('paginate(): match', JSON.stringify(match));
    const pagingOptions: any = {
      page: query.page,
      limit: query.limit,
      sort: query.sort ? query.sort : { createdAt: 'desc' },
    };
    if (query.projection) {
      pagingOptions.projection = {};
      for (const [key, value] of Object.entries(query.projection)) {
        if (value !== '0' && value !== '1') {
          continue;
        }
        pagingOptions.projection[key] = Number(value);
      }
    }
    this.logger.debug(
      'paginate(): pagingOptions',
      JSON.stringify(pagingOptions),
    );
    return model.paginate(match, pagingOptions);
  }

  /**
   * Paginate
   * @param {any} model
   * @param {any} pipe
   * @param {any} query
   * @return {Promise<any>}
   */
  public static aggregatePaginate(model: any, pipe: any, query: any) {
    this.logger.debug('aggregatePaginate(): match', JSON.stringify(pipe));
    const pagingOptions: any = {
      page: query.page,
      limit: query.limit,
      sort: query.sort ? query.sort : { createdAt: 'desc' },
    };
    if (query.projection) {
      pagingOptions.projection = query.projection;
    }
    return model.aggregatePaginate(model.aggregate(pipe), pagingOptions);
  }

  public static isValidateHash(hash) {
    return /^0x([A-Fa-f0-9]{64})$/.test(hash);
  }

  public static async countAggregation(model: any, pipe: any): Promise<number> {
    const aggregate = await model.aggregate([
      ...pipe,
      {
        $count: 'count',
      },
    ]);
    return aggregate.length ? aggregate[0].count : 0;
  }

  /**
   * Get wallet address in short format: �[6 first digits]�[4 last digits]�
   * @param {string} address
   * @return {string}
   */
  public static getShortAddress(address: string) {
    if (address.length <= 10) return address;
    return address.slice(0, 6) + '...' + address.slice(-4);
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

  // public static toDecimal(str: any) {
  // return mongoose.Types.Decimal128.fromString(str.toString());
  // }

  /**
   * Add slash before every occurrences of the special characters
   * @param {string} str
   * @return {string}
   */
  public static escapeSpecialChars(str: string) {
    return str.replace(/[!@#$%^&*()+=\-[\]\\';,./{}|":<>?~_]/g, '\\$&');
  }

  public static hashPassword = async (password: string): Promise<string> => {
    const saltOrRound = 10;
    return await bcrypt.hash(password, saltOrRound);
  };

  public static comparePassword = async (
    password: string,
    hash: string,
  ): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
  };

  public static getFirstRowFromA1Notation(a1Notation: string): number {
    // Split the input string into sheet name and range
    const [, range] = a1Notation.split('!');

    // Regular expression to extract row number from range
    const regex = /(\d+)/;

    const match = range.match(regex);

    if (!match || match.length !== 2) {
      throw new Error('Invalid A1 notation range format');
    }

    return parseInt(match[1], 10);
  }
}
