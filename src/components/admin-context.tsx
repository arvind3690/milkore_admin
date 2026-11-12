'use client';

import { createContext, useContext } from 'react';
import type { Admin } from '@/lib/api';

export const AdminContext = createContext<Admin | null>(null);

/** The logged-in admin (null while loading). UI hides super-admin actions; the API enforces them. */
export const useAdmin = () => useContext(AdminContext);
