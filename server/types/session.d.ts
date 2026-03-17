import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user: {
      id: number;
      email: string;
      userType: string;
      vendorId?: number; // Vendor booth number, only populated for vendor users
    };
  }
}
