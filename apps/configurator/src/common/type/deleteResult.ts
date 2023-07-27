export type DeleteResult<T> = {
  data?: T;
  isAlreadyDeleted: boolean;
};
