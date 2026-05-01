"use client";

import React, { createContext, useContext } from "react";
import { Profile } from "@/src/types";
import { User } from "@supabase/supabase-js";

interface UserContextValue {
  user: User;
  profile: Profile;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children, user, profile }: UserContextValue & { children: React.ReactNode }) {
  return (
    <UserContext.Provider value={{ user, profile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
