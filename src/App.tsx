import { useState, useEffect } from 'react';
import { AppSettings } from './types';
import Dashboard from './components/Dashboard';
import { Mail, Settings, ShieldCheck, MailWarning, Compass, Database, Key, Play } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  clientId: '',
  spreadsheetId: '1fTIAB5HkqWy9XS6cfgASXimpjgETw0QVs4H5b4egCSk', // Provided by user
  profilesRange: 'Contact Profiles!A1:Z200', // Pre-guessed tab
  summariesRange: 'Email Summaries!A1:Z500', // Pre-guessed tab
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('ceo_dashboard_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showOAuthGuide, setShowOAuthGuide] = useState(false);

  // Check URL hash for OAuth access token on boot
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const parsed = new URLSearchParams(hash.substring(1));
      const token = parsed.get('access_token');
      if (token) {
        setAccessToken(token);
        // Clear hash from address bar for visual cleanliness
        window.history.replaceState(null, '', window.location.origin + window.location.pathname);
      }
    }
  }, []);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('ceo_dashboard_settings', JSON.stringify(newSettings));
  };

  const handleLogout = () => {
    setAccessToken(null);
    window.location.hash = '';
  };

  const handleOAuthLogin = () => {
    if (!settings.clientId) {
      // Show warning or setup modal if no client ID is saved
      setShowOAuthGuide(true);
      return;
    }

    const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
    const state = Math.random().toString(36).substring(2, 15);

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ];

    const params: Record<string, string> = {
      client_id: settings.clientId,
      redirect_uri: window.location.origin + window.location.pathname,
      response_type: 'token',
      scope: scopes.join(' '),
      include_granted_scopes: 'true',
      state: state,
      prompt: 'consent',
    };

    const urlParams = Object.keys(params)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    // Perform standard implicit oauth flow redirect
    window.location.href = `${oauth2Endpoint}?${urlParams}`;
  };

  // Toggle directly into Demo Sandbox Mode
  const handleLaunchSandbox = () => {
    setAccessToken(null); // Explicit sandbox mode (no token)
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      
      {/* Auth Screen (Rendered if user is not authenticated and hasn't launched the Simulation) */}
      {!accessToken && !localStorage.getItem('ceo_dashboard_settings') && !localStorage.getItem('sandbox_active') ? (
        <div className="flex-1 flex flex-col justify-center items-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 via-stone-950 to-stone-950">
          <div className="w-full max-w-lg bg-stone-900 border border-stone-850 rounded-2xl shadow-2xl p-8 flex flex-col gap-6 text-stone-200 animate-in fade-in duration-300">
            
            {/* Greeting Icon */}
            <div className="flex flex-col items-center gap-2 text-center pb-2 border-b border-stone-850">
              <div className="p-3 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 text-indigo-400 mb-1 shadow-inner">
                <Mail className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold">Executive Productivity tool</span>
              <h1 className="font-sans font-bold text-2xl text-white tracking-tight">CEO Email Dashboard</h1>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-stone-300 leading-relaxed text-center">
                Review and dispatch enterprise responses synchronously. Connects your <strong>Gmail Inbox</strong> with <strong>CRM Contact Sheets</strong> to instantly classify priority (P1/P2/P3), review summarized topics, and execute prepared responses with absolute single-click precision.
              </p>

              {/* Targets Sheet details */}
              <div className="bg-stone-950/60 rounded-xl p-4 border border-stone-850/80 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-400 font-sans text-xs font-semibold">
                  <Database className="w-4 h-4 shrink-0" />
                  <span>Target Google Sheet Linked</span>
                </div>
                <div className="text-[11px] text-stone-400 leading-normal font-mono select-all truncate bg-stone-950 p-2 border border-stone-900 rounded">
                  {settings.spreadsheetId}
                </div>
              </div>
            </div>

            {/* Main actions */}
            <div className="flex flex-col gap-3.5 pt-2">
              
              {/* Connect live Workspace action */}
              <button
                type="button"
                onClick={() => {
                  if (!settings.clientId) {
                    setShowOAuthGuide(true);
                  } else {
                    handleOAuthLogin();
                  }
                }}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 font-sans font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2 text-white transition active:scale-[0.99] cursor-pointer"
              >
                <ShieldCheck className="w-4.5 h-4.5" />
                <span>Connect Live Google Workspace</span>
              </button>

              {/* Demo Mode trigger */}
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('sandbox_active', 'true');
                  handleLaunchSandbox();
                }}
                className="w-full py-3 border border-stone-800 hover:border-stone-700 bg-stone-950/40 hover:bg-stone-900/40 font-semibold text-stone-300 text-xs rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.99]"
              >
                <Compass className="w-4 h-4 text-stone-500" />
                <span>Enter Demonstration Sandbox</span>
              </button>
            </div>

            <div className="text-[10px] text-stone-500 text-center leading-normal">
              * Workspace authentication is direct and local. No customer data or access credentials ever transmit to external servers.
            </div>

          </div>

          {/* Setup / Instruction modal sheet for Google Client ID */}
          {showOAuthGuide && (
            <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
              <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-stone-100 animate-in zoom-in-95">
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-800">
                  <Key className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-sans font-bold text-sm text-white">Google OAuth Config Required</h3>
                </div>

                <div className="text-xs text-stone-300 leading-relaxed space-y-3 font-sans">
                  <p>
                    Because cloud-side backend provisioning is restricted, your unique browser requires a <strong>Google Client ID</strong> to authenticate securely with Gmail on the client side.
                  </p>
                  
                  <div className="bg-stone-950 p-4 rounded-xl border border-stone-850">
                    <span className="font-mono text-[10px] text-indigo-400 block font-semibold mb-1.5">How to get a Client ID:</span>
                    <ol className="list-decimal list-inside space-y-1 text-stone-400 text-[11px]">
                      <li>Go to <a href="https://console.cloud.google.com" target="_blank" className="underline text-indigo-400">GCP Console</a>.</li>
                      <li>Create / Select a project, search for <strong>APIs & Services</strong>, and enable **Gmail API** and **Google Sheets API**.</li>
                      <li>Go to <strong>Credentials</strong>, click **Create Credentials &rarr; OAuth Client ID**.</li>
                      <li>Set Web Application, and add this domain as an **Authorized Redirect URI**:</li>
                      <span className="block p-1.5 font-mono text-stone-300 mt-1.5 text-[10px] bg-stone-900 border border-stone-800 rounded select-all break-all">{window.location.origin}</span>
                    </ol>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block">Paste Client ID:</span>
                    <input
                      type="text"
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 placeholder-stone-700 font-mono focus:outline-none focus:border-indigo-500"
                      placeholder="xxxxxx-xxxxxxxx.apps.googleusercontent.com"
                      value={settings.clientId}
                      onChange={(e) => handleSaveSettings({ ...settings, clientId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOAuthGuide(false);
                      localStorage.setItem('sandbox_active', 'true');
                      handleLaunchSandbox();
                    }}
                    className="px-3.5 py-1.5 text-xs text-stone-400 hover:text-stone-200 transition"
                  >
                    Use Sandbox Instead
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOAuthGuide(false);
                      handleOAuthLogin();
                    }}
                    disabled={!settings.clientId}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-sans font-medium rounded-lg transition"
                  >
                    Proceed with OAuth
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* Render Full CEO Dashboard Dashboard frame inside authorized UI */
        <Dashboard
          accessToken={accessToken}
          onLogout={handleLogout}
          onLogin={() => {
            localStorage.removeItem('sandbox_active');
            handleOAuthLogin();
          }}
          settings={settings}
          onSaveSettings={handleSaveSettings}
        />
      )}

    </div>
  );
}
