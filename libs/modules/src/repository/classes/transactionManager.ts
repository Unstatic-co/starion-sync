export type TransactionObject = any

export interface ITransactionManager {
    createTransactionObject(): Promise<TransactionObject>;
    runWithTransaction<T>(fn: (transaction: TransactionObject) => Promise<T>): Promise<T>;
}