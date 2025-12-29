export interface CertificationTagDTO {
  id: number;
  name: string;
}

export interface CertificationCardDTO {
  id: number;
  title: string;
  issuer: string;
  date: string;
  link: string | null;
  image: string | null;
  tags: CertificationTagDTO[];
}
