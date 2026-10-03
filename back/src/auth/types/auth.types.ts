import { Rol } from '../../usuarios/usuarios.model.js';

export interface JwtPayload {
  sub: string;
  email: string;
  rol: Rol;
}

export interface UserAuthContext {
  userId: string;
  email: string;
  rol: Rol;
}