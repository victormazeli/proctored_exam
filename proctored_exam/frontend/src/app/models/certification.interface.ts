export interface Certification {
  _id: string;
  name: string;
  code: string;
  provider: string;
  description: string;
  active: boolean;
  passingScore: number;
  timeLimit: number;
  domains: Domain[];
}

export interface Domain {
  name: string;
  weight?: number;
}