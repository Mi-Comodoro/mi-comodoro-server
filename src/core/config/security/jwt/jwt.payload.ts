export interface JwtPayload {
  userId: string;
  email: string;
  userProfileId?: string;
  tokenVersion?: number;
}
