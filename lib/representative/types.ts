export type RepresentativeSession = {
  userId: string;
  fullName: string;
  email: string;
  role: "representative";
  token?: string;
  expiresAt?: string;
};

export type RepresentativeApiError = {
  status: number;
  title: string;
  detail: string;
  redirectTo?: string | null;
  accountStatus?: string;
};
