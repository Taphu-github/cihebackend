import { AppError } from '../utils/errors';


const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError('Access denied. Insufficient permissions.', 403);
    }

    next();
  };
};

export { roleMiddleware };