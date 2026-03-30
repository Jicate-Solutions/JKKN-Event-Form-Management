import { useQuery } from '@tanstack/react-query';
import {
  DashboardService,
  DashboardStats
} from '@/lib/services/dashboard-service';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => DashboardService.getDashboardStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
};

export const useUserStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'users'],
    queryFn: () => DashboardService.getUserStats(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

export const useEventStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'events'],
    queryFn: () => DashboardService.getEventStats(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

export const useFormStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'forms'],
    queryFn: () => DashboardService.getFormStats(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};
