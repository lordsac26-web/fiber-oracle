import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

/**
 * Displays a banner showing the age/status of subscriber data.
 * Shows at the top of the report so the user knows if data is current or stale.
 */
export default function SubscriberDataBanner({ subscriberMeta, matchCount }) {
  if (!subscriberMeta) return null;

  const uploadDate = new Date(subscriberMeta.upload_date || subscriberMeta.created_date);
  const daysOld = differenceInDays(new Date(), uploadDate);
  
  // Determine staleness
  const isStale = daysOld > 7;
  const isVeryStale = daysOld > 30;

  const bgColor = isVeryStale
    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
    : isStale
    ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
    : 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800';

  const textColor = isVeryStale
    ? 'text-red-800 dark:text-red-200'
    : isStale
    ? 'text-amber-800 dark:text-amber-200'
    : 'text-indigo-800 dark:text-indigo-200';

  const Icon = isVeryStale ? AlertTriangle : isStale ? Clock : CheckCircle2;

  return (
    <div className={`flex items-center justify-between px-4 py-2 rounded-lg border ${bgColor}`}>
      <div className={`flex items-center gap-2 text-sm ${textColor}`}>
        <Icon className="h-4 w-4" />
        <span className="font-medium">
          Customer Data: {format(uploadDate, 'MMM d, yyyy h:mm a')}
        </span>
        {daysOld > 0 && (
          <span className="opacity-70">
            ({daysOld} day{daysOld !== 1 ? 's' : ''} ago)
          </span>
        )}
        {daysOld === 0 && (
          <span className="opacity-70">(today)</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`text-xs ${textColor} border-current/30`}>
          <Users className="h-3 w-3 mr-1" />
          {subscriberMeta.record_count?.toLocaleString()} records
        </Badge>
        {matchCount > 0 && (
          <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300">
            {matchCount} matched
          </Badge>
        )}
        {isVeryStale && (
          <Badge className="text-[10px] bg-red-100 text-red-700 border-red-300">
            Stale — re-upload recommended
          </Badge>
        )}
        {isStale && !isVeryStale && (
          <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">
            Aging — consider updating
          </Badge>
        )}
      </div>
    </div>
  );
}