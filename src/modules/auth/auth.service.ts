import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRepository } from './auth.repository';
import { HttpError } from '../../utils/HttpError';

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface RegisterInput {
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export const authService = {
  async register({ email, password }: RegisterInput) {
    if (!isValidEmail(email) || typeof password !== 'string' || password.length < 8) {
      throw new HttpError(400, 'Invalid email or password (min 8 characters)');
    }

    const exists = await authRepository.emailExists(email);
    if (exists) {
      throw new HttpError(409, 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    return authRepository.create({ email, passwordHash });
  },

  async login({ email, password }: LoginInput) {
    if (!isValidEmail(email) || typeof password !== 'string') {
      throw new HttpError(400, 'Invalid email or password');
    }

    const user = await authRepository.findByEmail(email);

    if (!user || !user.password_hash) {
      throw new HttpError(404, 'Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new HttpError(404, 'Invalid email or password');
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET as string, {
      expiresIn: '1h',
    });

    return { token, user: { id: user.id, email: user.email } };
  },
};
