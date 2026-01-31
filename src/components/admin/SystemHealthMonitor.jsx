import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, Clock, AlertTriangle, CheckCircle, Database, MessageSquare, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import moment from 'moment';

export default function SystemHealthMonitor() {
  const [realtimeStats, setRealtimeStats] = useState({
    activeConversations: 0,
    avgResponseTime: 0,
    errorRate: 0,
    documentsIndexed: 0
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['systemHealthLogs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 100),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['healthConversations'],
    queryFn: () => base44.agents.listConversations({ agent_name: 'photon' }),
    refetchInterval: 30000
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['healthDocuments'],
    queryFn: () => base44.entities.ReferenceDocument.filter({ is_active: true }),
    refetchInterval: 60000
  });

  useEffect(() => {
    if (recentLogs.length > 0) {
      // Calculate metrics
      const last5Min = moment().subtract(5, 'minutes');
      const recentQueries = recentLogs.filter(l => 
        l.event_type === 'query' && moment(l.created_date).isAfter(last5Min)
      );
      
      const recentResponses = recentLogs.filter(l => 
        l.event_type === 'response' && moment(l.created_date).isAfter(last5Min)
      );

      const errors = recentLogs.filter(l => 
        l.status === 'error' && moment(l.created_date).isAfter(last5Min)
      );

      const avgTime = recentResponses.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / (recentResponses.length || 1);
      const errorRate = recentQueries.length > 0 ? (errors.length / recentQueries.length) * 100 : 0;

      setRealtimeStats({
        activeConversations: conversations.length,
        avgResponseTime: Math.round(avgTime),
        errorRate: errorRate.toFixed(1),
        documentsIndexed: documents.length
      });
    }
  }, [recentLogs, conversations, documents]);

  const getHealthStatus = () => {
    if (realtimeStats.errorRate > 10) return { status: 'critical', color: 'bg-red-500', icon: AlertTriangle };
    if (realtimeStats.errorRate > 5) return { status: 'warning', color: 'bg-yellow-500', icon: AlertTriangle };
    return { status: 'healthy', color: 'bg-green-500', icon: CheckCircle };
  };

  const health = getHealthStatus();
  const HealthIcon = health.icon;

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Health Status
            </CardTitle>
            <Badge className={`${health.color} text-white flex items-center gap-1`}>
              <HealthIcon className="w-3 h-3" />
              {health.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-white/70">Active Sessions</span>
              </div>
              <div className="text-2xl font-bold text-white">{realtimeStats.activeConversations}</div>
            </div>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-white/70">Avg Response</span>
              </div>
              <div className="text-2xl font-bold text-white">{realtimeStats.avgResponseTime}ms</div>
            </div>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-white/70">Error Rate</span>
              </div>
              <div className="text-2xl font-bold text-white">{realtimeStats.errorRate}%</div>
            </div>

            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-green-400" />
                <span className="text-xs text-white/70">Docs Indexed</span>
              </div>
              <div className="text-2xl font-bold text-white">{realtimeStats.documentsIndexed}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Stream */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Live Activity Feed (Last 5 min)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentLogs.filter(l => moment(l.created_date).isAfter(moment().subtract(5, 'minutes'))).slice(0, 10).map(log => (
              <div key={log.id} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Zap className={`w-3 h-3 ${log.status === 'error' ? 'text-red-400' : 'text-green-400'}`} />
                  <span className="text-xs text-white/70 truncate">{log.event_type}</span>
                  <span className="text-xs text-white/50 truncate">{log.user_email}</span>
                </div>
                <span className="text-xs text-white/40">{moment(log.created_date).fromNow()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}