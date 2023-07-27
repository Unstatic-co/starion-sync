export const MIMEType = {
  APPLICATION_JSON: 'application/json',
  IMAGE_PNG: 'image/png',
};

export const ErrorCode = {
  INVALID_DATA: 'E0',
  NO_DATA_EXISTS: 'E1',
  ALREADY_COMPLETED: 'E2',
  HEALTH_CHECK_FAILED: 'E3',
  ALREADY_EXISTS: 'E4',
};

export const QUEUE = {
  UPLOAD_IPFS: 'UPLOAD_IPFS',
  PORTAL_LIVE: 'PORTAL_LIVE',
  UNLOCK_NFT: 'UNLOCK_NFT',
  UNLOCK_QUANTITY: 'UNLOCK_QUANTITY',
  TRANSACTION_PROCESSING: 'TRANSACTION_PROCESSING',
};

export const QUEUE_SETTINGS = {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  delayedDebounce: 1000,
  removeOnSuccess: true,
  activateDelayedJobs: true,
};

export const CacheKeyName = {
  GET_CONFIG: {
    NAME: 'get-config',
    TTL: 300,
  },
  GET_FULL_CONFIG: {
    NAME: 'get-full-config',
    TTL: 300,
  },
  GET_DEFAULT_CURRENCY: {
    NAME: 'get-default-currency',
    TTL: 50000,
  },
  GET_TRANSACTIONS_DETAIL_BY_ID: (transactionId) => {
    return `get-transaction-detail-by-id-${transactionId}`;
  },
  GET_TOKENS_BY_NFT: (nftId) => {
    return `get-tokens-by-nft-${nftId}`;
  },
  GET_TOKEN_BY_ADDRESS: (address) => {
    return `get-tokens-by-address-${address}`;
  },
  GET_TOKEN_BY_ADDRESS_AND_NFT: (address, nftId) => {
    return `get-tokens-by-address-and-nft-${address}-${nftId}`;
  },
  GET_OWNER_QUANTITY: (tokenId, address) => {
    return `get-owner-quantity-${tokenId}-${address}`;
  },
};

export const S3_FOLDER = {
  REQUEST_VIDEO: 'video',
  REQUEST_TRANSCRIPT: 'transcript',
};

export const CRON_JOB = {};

export const MAX_RETRY = 3;

export const TIME_WAIT_RETRY = 300;
