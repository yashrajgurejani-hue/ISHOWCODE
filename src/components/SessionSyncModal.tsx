import React, { useState, useEffect } from 'react';
import { SessionPayload, SessionLog } from '../types';
import { AuthService } from '../services/auth';
import {
  FileSpreadsheet,
  Download,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  History,
  Link2,
} from 'lucide-react';

interface SessionSyncModalProps {
  currentSession: SessionPayload | null;
  theme: 'dark' | 'light';
  isOpen: boolean;
  onClose: () => void;
}

export const SessionSyncModal: React.FC<SessionSyncModalProps> = ({
  currentSession,
  theme,
  isOpen,
  onClose,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);
  const [historyLogs, setHistoryLogs] = useState<SessionLog[]>([]);
  const [durationString, setDurationString] = useState('00:00:00');

  useEffect(() => {
    setWebhookUrl(AuthService.getWebhookUrl());
    setHistoryLogs(AuthService.getSessionHistory());
  }, [isOpen]);

  useEffect(() => {
    if (!currentSession) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - currentSession.sessionStartTime;
      setDurationString(AuthService.formatDuration(elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentSession]);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (!currentSession) return;
    const activeWithDuration: SessionPayload = {
      ...currentSession,
      sessionDuration: durationString,
    };
    AuthService.exportToCSV([activeWithDuration, ...historyLogs]);
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    AuthService.setWebhookUrl(webhookUrl);
    setSyncStatus({ type: 'success', message: 'Webhook endpoint URL updated.' });
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleTriggerWebhookSync = async () => {
    if (!currentSession) return;
    const activeWithDuration: SessionPayload = {
      ...currentSession,
      sessionDuration: durationString,
    };

    setSyncStatus({ type: 'loading', message: 'Sending session payload to webhook...' });
    const result = await AuthService.syncToWebhook(activeWithDuration, webhookUrl);

    if (result.success) {
      setSyncStatus({ type: 'success', message: result.message });
    } else {
      setSyncStatus({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-7 rounded-3xl border shadow-2xl flex flex-col gap-6"
        style={{
          backgroundColor: theme === 'dark' ? '#131B2E' : '#FFFFFF',
          borderColor: 'rgba(99, 102, 241, 0.25)',
          color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b pb-4"
          style={{ borderColor: 'rgba(99, 102, 241, 0.15)' }}
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-xl font-black" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Session Data Tracking & Spreadsheet Sync
              </h3>
              <p className="text-xs opacity-75">
                Automated session telemetry, Google Sheets Webhook sync, and CSV export
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors cursor-pointer text-xs font-bold"
          >
            Close
          </button>
        </div>

        {/* Current Active Session KPI strip */}
        {currentSession && (
          <div
            className="p-5 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs shadow-inner"
            style={{
              backgroundColor: theme === 'dark' ? '#0B0F19' : '#F8FAFC',
              borderColor: 'rgba(99, 102, 241, 0.2)',
            }}
          >
            <div>
              <span className="opacity-60 block text-[11px]">User ID</span>
              <span className="font-mono font-bold truncate block text-cyan-300">{currentSession.userId}</span>
            </div>
            <div>
              <span className="opacity-60 block text-[11px]">Email Account</span>
              <span className="font-bold truncate block">{currentSession.email}</span>
            </div>
            <div>
              <span className="opacity-60 block text-[11px]">Active Duration</span>
              <span className="font-mono tabular-nums font-black text-amber-400 block text-sm">{durationString}</span>
            </div>
            <div>
              <span className="opacity-60 block text-[11px]">Signs Translated</span>
              <span className="font-mono tabular-nums font-black text-emerald-400 block text-sm">
                {currentSession.totalGesturesDetected}
              </span>
            </div>
          </div>
        )}

        {/* Status Alert */}
        {syncStatus && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
              syncStatus.type === 'error'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                : syncStatus.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
            }`}
          >
            {syncStatus.type === 'loading' && <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />}
            {syncStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {syncStatus.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span className="font-medium">{syncStatus.message}</span>
          </div>
        )}

        {/* Webhook Endpoint Integration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-cyan-400" />
              <span>External Webhook URL</span>
            </label>
            <span className="text-[11px] opacity-60">
              (Google Sheets Apps Script / Webhook Endpoint)
            </span>
          </div>

          <form onSubmit={handleSaveWebhook} className="flex gap-2">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 px-4 py-2.5 rounded-2xl border text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400"
              style={{
                backgroundColor: theme === 'dark' ? '#0B0F19' : '#F8FAFC',
                borderColor: 'rgba(99, 102, 241, 0.25)',
                color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
              }}
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all hover:bg-white/5 cursor-pointer"
              style={{ borderColor: 'rgba(99, 102, 241, 0.25)' }}
            >
              Save URL
            </button>
            <button
              type="button"
              onClick={handleTriggerWebhookSync}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-xl flex items-center gap-1.5 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #FF5C67, #FF7854)' }}
            >
              <Send className="w-4 h-4" />
              <span>Sync Now</span>
            </button>
          </form>
        </div>

        {/* Export to CSV action */}
        <div
          className="flex items-center justify-between pt-3 border-t"
          style={{ borderColor: 'rgba(99, 102, 241, 0.15)' }}
        >
          <div>
            <h4 className="text-xs font-bold">Export to Spreadsheet</h4>
            <p className="text-[11px] opacity-70">
              Downloads session timestamps, user IDs, duration, and detection metrics
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer text-cyan-300 border-cyan-500/40 bg-cyan-500/10 shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV (.csv)</span>
          </button>
        </div>

        {/* Previous Session History Table */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <span>Session Log Archive</span>
            </span>
            <span className="text-[11px] opacity-60 font-mono tabular-nums">
              {historyLogs.length} archived
            </span>
          </div>

          <div
            className="max-h-48 overflow-y-auto rounded-2xl border text-xs"
            style={{
              backgroundColor: theme === 'dark' ? '#0B0F19' : '#FFFFFF',
              borderColor: 'rgba(99, 102, 241, 0.2)',
            }}
          >
            {historyLogs.length === 0 ? (
              <div className="p-5 text-center opacity-60 text-[11px]">
                No previous sessions archived yet. Current session will archive automatically on logout.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead
                  className="border-b opacity-70 text-[11px]"
                  style={{ borderColor: 'rgba(99, 102, 241, 0.15)' }}
                >
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3 text-right">Signs Translated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5">
                      <td className="p-3 font-mono text-cyan-300">{log.loginTime}</td>
                      <td className="p-3 font-semibold">{log.name}</td>
                      <td className="p-3 font-mono tabular-nums">{log.sessionDuration}</td>
                      <td className="p-3 text-right font-mono tabular-nums font-bold text-emerald-400">
                        {log.totalGesturesDetected}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
