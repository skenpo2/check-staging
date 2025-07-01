import IUser from '../modules/user/model/user.model';

declare global {
  namespace Express {
    interface User extends IUser {
      _id?: any;
      name: any;
      email: any;
      role: any;
      isVerified: any;
    }
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument; 
    }
  }
} 