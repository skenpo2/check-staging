import { UserDocument } from '../models/user.model';

declare global {
  namespace Express {
    interface User extends UserDocument {}
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument; 
    }
  }
} 