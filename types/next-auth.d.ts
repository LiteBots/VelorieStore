import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      discordId: string;
      name: string;
      image: string | null;
      role: 'user' | 'creator' | 'admin';
      sellerSlug: string | null;
      banned: boolean;
    };
  }
}
