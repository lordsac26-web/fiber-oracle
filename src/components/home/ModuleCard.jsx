import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ModuleCard({ module, compact = false, darkMode = true }) {
  return (
    <Link to={createPageUrl(module.page)} className="block h-full">
      <div
        className={cn(
          'group relative overflow-hidden rounded-2xl h-full cursor-pointer transition-all duration-300',
          darkMode
            ? 'bg-white/5 border border-white/10 hover:border-cyan-400/40 backdrop-blur-sm hover:shadow-[0_0_24px_rgba(0,240,255,0.15)] hover:bg-white/10'
            : 'bg-white border border-slate-200 hover:border-blue-400/60 shadow-sm hover:shadow-md hover:bg-slate-50',
          'hover:-translate-y-1',
          compact ? 'p-2.5 md:p-3' : 'p-3 md:p-5'
        )}
      >
        {/* Gradient top-edge glow on hover */}
        <div className={cn(
          'absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/0 to-transparent',
          'group-hover:via-cyan-400/60 transition-all duration-500'
        )} />

        {/* Background gradient bloom */}
        <div className={cn(
          `absolute inset-0 bg-gradient-to-br ${module.color} opacity-0`,
          'group-hover:opacity-[0.06] transition-opacity duration-300'
        )} />

        <div className={cn('flex', compact ? 'items-start gap-2 md:gap-3' : 'flex-col items-center text-center md:items-start md:text-left')}>
          {/* Icon */}
          <div className={cn(
            `bg-gradient-to-br ${module.color} flex items-center justify-center shadow-lg`,
            'rounded-xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110',
            compact ? 'w-8 h-8 md:w-9 md:h-9' : 'w-10 h-10 md:w-14 md:h-14 mb-2 md:mb-3'
          )}>
            <module.icon className={cn('text-white', compact ? 'h-4 w-4' : 'h-5 w-5 md:h-7 md:w-7')} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className={cn(
              'font-semibold leading-tight transition-colors duration-200',
              darkMode ? 'text-white group-hover:text-cyan-300' : 'text-slate-900 group-hover:text-blue-700',
              compact ? 'text-xs md:text-sm' : 'text-sm md:text-base'
            )}>
              {module.title}
              {module.isBeta && (
                <Badge className="ml-1.5 bg-amber-500/80 text-[8px] px-1 py-0 align-middle">
                  <FlaskConical className="h-2 w-2 mr-0.5 inline" />BETA
                </Badge>
              )}
              {module.isNew && (
                <Badge className="ml-1.5 bg-emerald-500/80 text-[8px] px-1 py-0 align-middle">NEW</Badge>
              )}
            </h3>
            <p className={cn(
              'text-slate-400 mt-0.5 line-clamp-2',
              compact ? 'text-[10px] md:text-xs' : 'text-xs hidden md:block'
            )}>
              {module.description}
            </p>
          </div>
        </div>

        {/* Chevron */}
        {!compact && (
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
            <ChevronRight className="h-4 w-4 text-cyan-400" />
          </div>
        )}
      </div>
    </Link>
  );
}