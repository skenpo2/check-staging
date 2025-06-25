import { IUser as UserType } from '../modules/user/model/user.model';

declare global {
  namespace Express {
    interface User extends UserType {
      _id?: any;
      role: string;
    }
  }
}
