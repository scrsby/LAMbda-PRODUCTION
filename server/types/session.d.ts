import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user: {
      id: number;
      email: string;
      userType: string;
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      vendorId?: number | null; // Vendor booth number, only populated for vendor users
    };
  }
}
