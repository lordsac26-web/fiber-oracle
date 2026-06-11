import React from 'react';
import { Button } from "@/components/ui/button";

export default function PaginationBar({ page, setPage, recordsLength, pageSize, selectedCount, className = '' }) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Page {page}
        {selectedCount > 0 && (
          <span className="ml-3 font-medium text-blue-600 dark:text-blue-400">
            {selectedCount} selected across all pages
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => p + 1)}
          disabled={recordsLength < pageSize}
        >
          Next
        </Button>
      </div>
    </div>
  );
}