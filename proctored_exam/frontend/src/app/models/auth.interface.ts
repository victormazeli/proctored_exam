export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    profile: {
      name: string;
      avatar: string;
    };
    settings: any;
  };
  message?: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  token: string;
  avatar: string;
}
