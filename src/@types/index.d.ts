import IUser from '../modules/user/model/user.model';

declare global {
  namespace Express {
    interface User extends IUser {
      _id?: any;
    }
  }
}
