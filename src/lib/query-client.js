import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 2,
			retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
			staleTime: 30 * 1000, // 30 seconds - reduces unnecessary refetches
			gcTime: 5 * 60 * 1000, // 5 minutes cache retention
		},
	},
});