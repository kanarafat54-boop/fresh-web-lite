export interface FreshIdentity {
  id: string;

  personal: {
    name: string;
    username: string;
    avatar?: string;
  };

  roles: {
    user: boolean;
    creator: boolean;
    developer: boolean;
    business: boolean;
  };

  preferences: {
    language: string;
    theme: "light" | "dark";
  };

  createdAt: string;
}
