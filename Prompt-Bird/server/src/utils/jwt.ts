import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type JwtPayload = {
  sub: string;
  workspaceId: string;
};

export const signJwt = (payload: JwtPayload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const verifyJwt = (token: string) => jwt.verify(token, env.jwtSecret) as JwtPayload & jwt.JwtPayload;
