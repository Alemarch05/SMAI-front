export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user?: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
}