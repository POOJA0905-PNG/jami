import React, { useState, useEffect } from 'react';
import { X, Settings, Database, HelpCircle, Key, RefreshCw, Layers } from 'lucide-react';
import { AppSettings } from '../types';
import { fetchSpreadsheetTabs } from '../utils/googleApi';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  accessToken: string | null;
}

export default function SettingsDrawer({
  isOpen,
  onClose,
  settings,
  onSave,
  accessToken,
}: SettingsDrawerProps) {
  const [clientId, setClientId] = useState(settings.clientId);
  const [spreadsheetId, setSpreadsheetId] = useState(settings.spreadsheetId);
  const [profilesRange, setProfilesRange] = useState(settings.profilesRange);
  const [summariesRange, setSummariesRange] = useState(settings.summariesRange);
  const [tabs, setTabs] = useState<Array<{ title: string; id: number }>>([]);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);

  // Auto-fetch spreadsheet tabs if accessToken is available
  useEffect(() => {
    if (accessToken && spreadsheetId && isOpen) {
      loadTabs();
    }
  }, [accessToken, spreadsheetId, isOpen]);

  const loadTabs = async () => {
    if (!accessToken || !spreadsheetId) return;
    setIsLoadingTabs(true);
    setTabError(null);
    try {
      const fetchedTabs = await fetchSpreadsheetTabs(accessToken, spreadsheetId);
      setTabs(fetchedTabs);
      
      // Auto-assign ranges if empty and tabs are found
      if (fetchedTabs.length > 0) {
        const hasProfilesTab = fetchedTabs.some(t => t.title.toLowerCase().includes('profile') || t.title.toLowerCase().includes('contact'));
        const hasSummariesTab = fetchedTabs.some(t => t.title.toLowerCase().includes('summary') || t.title.toLowerCase().includes('email'));
        
        if (hasProfilesTab && !profilesRange) {
          const matched = fetchedTabs.find(t => t.title.toLowerCase().includes('profile') || t.title.toLowerCase().includes('contact'))?.title;
          if (matched) setProfilesRange(`${matched}!A1:Z200`);
        }
        if (hasSummariesTab && !summariesRange) {
          const matched = fetchedTabs.find(t => t.title.toLowerCase().includes('summary') || t.title.toLowerCase().includes('email'))?.title;
          if (matched) setSummariesRange(`${matched}!A1:Z500`);
        }
      }
    } catch (err: any) {
      setTabError('Could not fetch sheet tabs. Check spreadsheet share settings or ID.');
      console.error(err);
    } finally {
      setIsLoadingTabs(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      clientId: clientId.trim(),
      spreadsheetId: spreadsheetId.trim(),
      profilesRange: profilesRange.trim() || 'A1:Z100',
      summariesRange: summariesRange.trim() || 'A1:Z100',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-stone-900 border-l border-stone-800 text-stone-100 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-250">
      {/* Header */}
      <div className="p-5 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-indigo-400" />
          <h3 className="font-sans font-medium text-lg text-white">System Settings</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Google OAuth Help */}
        <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-800/80 text-xs text-stone-300 leading-relaxed space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-medium pb-1">
            <HelpCircle className="w-4 h-4" />
            <span>Connection Architecture</span>
          </div>
          <p>
            This applet integrates directly with Google Workspace using Client-Side OAuth.
            To connect your live Gmail mailbox and Google Sheet, configure your Google API credentials below.
          </p>
          <p className="text-stone-400">
            For local testing, a high-fidelity <strong>Sandbox Mode</strong> is enabled by default with simulated enterprise records.
          </p>
        </div>

        {/* Client ID field */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-indigo-400" />
            Google OAuth Client ID
          </label>
          <input
            type="text"
            className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-indigo-500 font-mono"
            placeholder="xxxxxx-xxxxxxxx.apps.googleusercontent.com"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <p className="text-[10px] text-stone-500 leading-normal">
            Obtain from Gmail/Docs APIs enabled in GCP Console under Credentials &rarr; OAuth Client ID. Authorized redirect URIs must include this app's domain.
          </p>
        </div>

        {/* Spreadsheet ID field */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Google Spreadsheet ID
          </label>
          <input
            type="text"
            className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500 font-mono"
            placeholder="1fTIAB5HkqWy9XS6cfgASXimpjgETw0QVs4H5b4egCSk"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            required
          />
          <p className="text-[10px] text-stone-500">
            Extracted from Google Spreadsheet URL. Shared edit link: <span className="font-mono text-stone-400 select-all">1fTIAB...</span>
          </p>
        </div>

        {/* Tab configuration & fetch */}
        <div className="space-y-4 pt-2 border-t border-stone-800/80">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Sheet Ranges Config
            </label>
            {accessToken && (
              <button
                type="button"
                onClick={loadTabs}
                disabled={isLoadingTabs || !spreadsheetId}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingTabs ? 'animate-spin' : ''}`} />
                Fetch Tabs
              </button>
            )}
          </div>

          {tabError && <p className="text-[10px] text-red-400 bg-red-950/20 px-2 py-1.5 rounded">{tabError}</p>}

          {tabs.length > 0 ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[11px] text-stone-400 font-sans">Contact Profiles Tab</span>
                <select
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none"
                  value={profilesRange.split('!')[0]}
                  onChange={(e) => setProfilesRange(`${e.target.value}!A1:Z200`)}
                >
                  <option value="">-- Auto Match / Select --</option>
                  {tabs.map(t => (
                    <option key={t.id} value={t.title}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-stone-400 font-sans">Email Summaries Tab</span>
                <select
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none"
                  value={summariesRange.split('!')[0]}
                  onChange={(e) => setSummariesRange(`${e.target.value}!A1:Z500`)}
                >
                  <option value="">-- Auto Match / Select --</option>
                  {tabs.map(t => (
                    <option key={t.id} value={t.title}>{t.title}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[11px] text-stone-400 font-sans">Profiles Tab Name or Range</span>
                <input
                  type="text"
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none font-mono"
                  placeholder="Contact Profiles!A1:Z200"
                  value={profilesRange}
                  onChange={(e) => setProfilesRange(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-stone-400 font-sans">Summaries Tab Name or Range</span>
                <input
                  type="text"
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none font-mono"
                  placeholder="Email Summaries!A1:Z500"
                  value={summariesRange}
                  onChange={(e) => setSummariesRange(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Footer / Controls */}
      <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-sans font-medium text-stone-400 hover:text-stone-200 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-sans font-medium rounded-lg shadow transition"
        >
          Apply Config
        </button>
      </div>
    </div>
  );
}
