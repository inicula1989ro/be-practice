import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRepository } from './auth.repository';
import { HttpError } from '../../utils/HttpError';
import crypto from 'crypto';
import { sendActivationEmail } from '../../utils/mailer'

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
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    const user = await authRepository.create({
      email, passwordHash, activationToken,
      activationTokenExpires,
    });

    // FRONTEND_ORIGIN can be a comma-separated list (see app.ts's CORS setup)
    // — the first entry is the canonical frontend to link back to.
    const frontendOrigin = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173').split(',')[0].trim();
    const activationUrl = `${frontendOrigin}/activate?token=${activationToken}`;

    await sendActivationEmail(email, activationUrl);

    return user;
  },

  async activate(token: string) {
    if (!token) {
      throw new HttpError(400, 'Missing activation token');
    }

    const user = await authRepository.findByActivationToken(token);

    if (!user) {
      throw new HttpError(400, 'Invalid activation token');
    }
    if (!user.activation_token_expires || user.activation_token_expires < new Date()) {
      throw new HttpError(400, 'Activation token has expired');
    }

    await authRepository.activate(user.id);

    const jwtToken = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET as string, {
      expiresIn: '1h',
    });

    return { token: jwtToken, user: { id: user.id, email: user.email } };
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

    if (!user.email_verified) {
      throw new HttpError(403, 'Please activate your account before logging in — check your email');
    }

    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET as string, {
      expiresIn: '1h',
    });

    return { token, user: { id: user.id, email: user.email } };
  },
};
