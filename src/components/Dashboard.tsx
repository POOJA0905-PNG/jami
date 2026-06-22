import { useState, useEffect } from 'react';
import { CombinedEmail, EmailMessage, ContactProfile, EmailSummary, AppSettings, Priority } from '../types';
import { fetchGmailInbox, fetchSheetValues, parseContactProfiles, parseEmailSummaries, sendGmailReply } from '../utils/googleApi';
import EmailList from './EmailList';
import EmailDetail from './EmailDetail';
import SettingsDrawer from './SettingsDrawer';
import { Settings, ShieldAlert, Sparkles, RefreshCcw, Database, MailOpen, LogOut, Check, Play } from 'lucide-react';

interface DashboardProps {
  accessToken: string | null;
  onLogout: () => void;
  onLogin: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

// Global High-Fidelity Mock Seed Data (Fallback & Demo Mode)
const MOCK_GMAILS: EmailMessage[] = [
  {
    id: 'msg_001',
    threadId: 'thread_001',
    subject: 'URGENT: Databeat Q3 Analytics Sync & Spreadsheet Integration',
    fromName: 'vanga.poojasri',
    fromEmail: 'vanga.poojasri@databeat.io',
    date: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    snippet: 'Hi, I hope you are doing well. We need to finalize the Google Sheet sync schedule for the CEO dashboard. The analytics endpoints are ready for Databeat metrics...',
    body: `Hi,

Hope you are having a productive week.

We have successfully configured the real-time database feeds for our South Asian Workspace metrics, and the analytics tables are fully synchronized. 

I've updated our metrics in the shared Sheet. Please review the milestone results urgently so we can schedule our deployment of the synchronized data dashboard models.

Let me know if we can schedule a quick walkthrough.

Best regards,
Pooja
CEO & Founder, Databeat`,
  },
  {
    id: 'msg_002',
    threadId: 'thread_002',
    subject: 'Board update: Quantum Series A financial model review required',
    fromName: 'John Miller',
    fromEmail: 'john.miller@quantum-tech.io',
    date: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    snippet: 'Checking in regarding our Q2-Q3 forecasts. We need the final signed agenda and finance spreadsheets package before our investor update deck goes live...',
    body: `Hi,

I wanted to quickly check in on the board deck preparations. 

We need to confirm the Q3 financial models and approve the proposed agenda items for the advisory board meeting scheduled for next week. Please review the updated figures on our secure Drive and sign off.

If you have any revisions to the forecast slides, send them over by COP today.

Best,
John Miller
Managing Director, Quantum Tech`,
  },
  {
    id: 'msg_003',
    threadId: 'thread_003',
    subject: 'Bright Designs: Brand Identity Iteration V2 styles',
    fromName: 'Sarah Liao',
    fromEmail: 'sarah.liao@brightdesigns.com',
    date: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    snippet: 'Hello, we finished adding the slate theme colors and spaced typography. Please see our design specs attachment and review when you have a moment...',
    body: `Hi,

We've finalized the visual styling boards for our rebranding project. 

Following your feedback on "Architectural Honesty" and "Aesthetic Pairings", we have refined the typography (Space Grotesk + Inter) and curated a premium dark theme utilizing high-contrast accents and generous negative space. 

Please review the revised files in the design folder and let us know your preferred choice.

Warmly,
Sarah Liao
Creative VP, Bright Designs`,
  },
  {
    id: 'msg_004',
    threadId: 'thread_004',
    subject: 'Weekly Tech Digest: Google Workspace Automation Best Practices',
    fromName: 'Tech Insights Newsletter',
    fromEmail: 'digest@techinsights.com',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 24 hours ago
    snippet: 'This week we discuss Google Cloud script optimization, Google Sheets row indexing limits, and Gmail MIME formatting headers...',
    body: `Hello,

Welcome to our weekly newsletter!

This week we are diving into advanced tricks for Gmail API and Google Sheets API integrations, including:
- Securing OAuth implicit tokens in-memory
- Recursive parsing of deeply nested multipart email payloads
- Structuring resilient database tables on Google Sheets

Read the full publication in your browser.

- The Tech Insights Team`,
  },
];

const MOCK_PROFILES: ContactProfile[] = [
  {
    email: 'vanga.poojasri@databeat.io',
    name: 'vanga.poojasri',
    company: 'Databeat',
    title: 'Founder & CEO',
    bio: 'Highly valued strategic workspace partner. Coordinates core custom analytics data feeds.',
    priority: 'P1',
  },
  {
    email: 'john.miller@quantum-tech.io',
    name: 'John Miller',
    company: 'Quantum Ventures',
    title: 'Managing Director',
    bio: 'Lead Series A Investor. Crucial relationship. Always requires 1 hour reply SLA on executive items.',
    priority: 'P1',
  },
  {
    email: 'sarah.liao@brightdesigns.com',
    name: 'Sarah Liao',
    company: 'Bright Designs',
    title: 'VP Creative',
    bio: 'Executive agency designing new visual identity, layouts, and print assets.',
    priority: 'P2',
  },
  {
    email: 'digest@techinsights.com',
    name: 'Tech Insights Digest',
    company: 'Tech Insights',
    title: 'Publisher',
    bio: 'Regular subscription tech content. Safely deferred during high priority hours.',
    priority: 'P3',
  },
];

const MOCK_SUMMARIES: EmailSummary[] = [
  {
    email: 'vanga.poojasri@databeat.io',
    subject: 'URGENT: Databeat Q3 Analytics Sync & Spreadsheet Integration',
    summary: 'Pooja is requesting an urgent final review of the Analytics Sheet integration schema in order to lock in schedules for the custom telemetry dashboard.',
    suggestedReply: `Hi Pooja,

I have received your note and reviewed the updated South Asian workspace metrics in our shared sheet. The schema matches perfectly. 

I have authorized our integration systems and are fully ready to transition. Let's hop on a brief alignment call on Thursday afternoon to synchronize final systems.

Best regards,
CEO`,
    priority: 'P1',
  },
  {
    email: 'john.miller@quantum-tech.io',
    subject: 'Board update: Quantum Series A financial model review required',
    summary: 'John with Quantum MD asks for signoff on board meeting slides and Q3 investment forecast spreadsheets today.',
    suggestedReply: `Hi John,

Thank you for the update. I've finished auditing the revised financial models on our secure workspace. Everything is accurate and signed off.

Our team has appended the deck slides, and you should receive the workspace meeting link and files shortly.

Best,
CEO`,
    priority: 'P1',
  },
  {
    email: 'sarah.liao@brightdesigns.com',
    subject: 'Bright Designs: Brand Identity Iteration V2 styles',
    summary: 'Sarah Liao has delivered brand styling boards featuring refined display typography and modern slate color schemes.',
    suggestedReply: `Dear Sarah,

Thank you for sending the updated specs. The new slate contrast theme and layout rhythms look absolutely brilliant and reflect our aesthetic goals.

Let's proceed with this specification. Looking forward to compiling the final assets.

Sincerely,
CEO`,
    priority: 'P2',
  },
  {
    email: 'digest@techinsights.com',
    subject: 'Weekly Tech Digest: Google Workspace Automation Best Practices',
    summary: 'Weekly tech trends and engineering guidelines on Gmail API integration architectures.',
    suggestedReply: 'Thanks for sharing the weekly trends list.',
    priority: 'P3',
  },
];

export default function Dashboard({
  accessToken,
  onLogout,
  onLogin,
  settings,
  onSaveSettings,
}: DashboardProps) {
  const [emails, setEmails] = useState<CombinedEmail[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Track counts
  const syncCounts = {
    P1: emails.filter(e => e.priority === 'P1').length,
    P2: emails.filter(e => e.priority === 'P2').length,
    P3: emails.filter(e => e.priority === 'P3').length,
  };

  const isSandboxMode = !accessToken;

  // Sync inbox and spreadsheet
  useEffect(() => {
    syncDashboard();
  }, [accessToken, settings]);

  const syncDashboard = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      if (isSandboxMode) {
        // High fidelity sandbox simulation
        await new Promise((resolve) => setTimeout(resolve, 800)); // Simulated lag for realism
        const combined = combineData(MOCK_GMAILS, MOCK_PROFILES, MOCK_SUMMARIES);
        setEmails(combined);
        if (combined.length > 0) {
          setSelectedEmailId(combined[0].gmail.id);
        }
      } else {
        // Load Live Google Workspace APIs
        const liveGmails = await fetchGmailInbox(accessToken!, 15);
        
        let liveProfiles: ContactProfile[] = [];
        let liveSummaries: EmailSummary[] = [];

        // Try reading sheet data
        if (settings.spreadsheetId) {
          try {
            // Read Profiles
            const profileRows = await fetchSheetValues(accessToken!, settings.spreadsheetId, settings.profilesRange);
            if (profileRows) {
              liveProfiles = parseContactProfiles(profileRows);
            }
            
            // Read Summaries
            const summaryRows = await fetchSheetValues(accessToken!, settings.spreadsheetId, settings.summariesRange);
            if (summaryRows) {
              liveSummaries = parseEmailSummaries(summaryRows);
            }
          } catch (sheetErr) {
            console.warn('Sheets API parse warning:', sheetErr);
            // Non-blocking sheet warning
          }
        }

        const combined = combineData(liveGmails, liveProfiles, liveSummaries);
        setEmails(combined);
        if (combined.length > 0 && !selectedEmailId) {
          setSelectedEmailId(combined[0].gmail.id);
        }
      }
    } catch (err: any) {
      console.error('Data Sync Error:', err);
      setErrorMessage(
        isSandboxMode
          ? 'Error loading simulation engine.'
          : 'Failed syncing Google Workspace. Please check API Client ID permissions or Sheet ID.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper to resolve relationships and merge Gmail with Google Sheet models
  const combineData = (
    gmails: EmailMessage[],
    profiles: ContactProfile[],
    summaries: EmailSummary[]
  ): CombinedEmail[] => {
    return gmails.map((msg) => {
      // Find matching CRM profile by sender's email
      const matchedProfile = profiles.find(
        (p) => p.email && msg.fromEmail && p.email.toLowerCase() === msg.fromEmail.toLowerCase()
      ) || null;

      // Find matching summary record by subject/snippet or sender
      const matchedSummary = summaries.find(
        (s) => s.email && msg.fromEmail && s.email.toLowerCase() === msg.fromEmail.toLowerCase()
      ) || null;

      // Resolve priority (Priority from sheet profiles takes highest precedence, then summaries, then default)
      let resolvedPriority: Priority = 'P3';
      if (matchedProfile?.priority) {
        resolvedPriority = matchedProfile.priority;
      } else if (matchedSummary?.priority) {
        resolvedPriority = matchedSummary.priority;
      } else {
        // Default heuristics based on keywords
        const txt = `${msg.subject} ${msg.snippet}`.toLowerCase();
        if (txt.includes('urgent') || txt.includes('immediate') || txt.includes('asap') || txt.includes('critical')) {
          resolvedPriority = 'P1';
        } else if (txt.includes('confirm') || txt.includes('schedule') || txt.includes('review')) {
          resolvedPriority = 'P2';
        }
      }

      return {
        gmail: msg,
        profile: matchedProfile,
        summary: matchedSummary,
        priority: resolvedPriority,
      };
    });
  };

  // Callback to handle sending a draft reply
  const handleSendReply = async (to: string, subject: string, body: string, threadId?: string): Promise<boolean> => {
    setIsSending(true);
    try {
      if (isSandboxMode) {
        // Simulated sandbox delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
        // Simulate sending by updating local state (removing or editing local tag)
        setEmails((prev) => prev.filter((e) => e.gmail.id !== selectedEmailId));
        setSelectedEmailId(null);
        return true;
      } else {
        // Live Gmail API Call
        const result = await sendGmailReply(accessToken!, to, subject, body, threadId);
        if (result) {
          // Refresh after success and clear selected
          syncDashboard();
          setSelectedEmailId(null);
          return true;
        }
      }
      return false;
    } catch (e: any) {
      console.error('Gmail API Send failed:', e);
      throw e;
    } finally {
      setIsSending(false);
    }
  };

  const activeEmail = emails.find((e) => e.gmail.id === selectedEmailId) || null;

  return (
    <div className="flex flex-col h-screen w-full bg-stone-950 text-stone-100 font-sans antialiased overflow-hidden select-none">
      
      {/* Top Main Navigation Header */}
      <header className="h-16 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-700 to-indigo-500 rounded-xl shadow-lg shadow-indigo-600/10">
            <MailOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-400">Executive Console</span>
            <h1 className="font-sans font-semibold text-sm leading-none text-white">CEO Email Dashboard</h1>
          </div>
        </div>

        {/* Sync, Logging & Settings Panel Buttons */}
        <div className="flex items-center gap-3">
          {/* Mode Badge indicator */}
          <div className={`text-[11px] font-medium font-mono px-3 py-1 rounded-full border hidden sm:flex items-center gap-1.5 ${
            isSandboxMode
              ? 'bg-amber-950/20 text-amber-400 border-amber-950/60'
              : 'bg-emerald-950/20 text-emerald-400 border-emerald-950/60'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isSandboxMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-400'}`}></span>
            {isSandboxMode ? 'Sandbox Mode' : 'Workspace Synced'}
          </div>

          <button
            onClick={syncDashboard}
            disabled={isSyncing}
            className="p-2 border border-stone-800 rounded-lg hover:border-stone-700 hover:bg-stone-900 text-stone-400 hover:text-stone-100 transition shrink-0"
            title="Reload Workspace Connection"
          >
            <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 border border-stone-800 rounded-lg hover:border-stone-700 hover:bg-stone-900 text-stone-400 hover:text-stone-100 transition shrink-0"
            title="System Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {!isSandboxMode ? (
            <button
              onClick={onLogout}
              className="p-2 border border-stone-800 rounded-lg hover:border-stone-700 hover:bg-stone-900 text-red-400 hover:text-red-300 transition shrink-0 flex items-center gap-1.5 text-xs"
              title="Disconnect Google"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline font-medium">Log out</span>
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-sans font-medium rounded-lg shadow-lg hover:shadow-indigo-600/10 transition shrink-0 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Connect Live APIs</span>
            </button>
          )}
        </div>
      </header>

      {/* Synchronizing / Database Info strip */}
      <section className="bg-stone-900/40 border-b border-stone-850 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-10 shrink-0">
        <div className="flex items-center gap-2 text-stone-400 truncate">
          <Database className="w-4 h-4 text-stone-500 shrink-0" />
          <span className="truncate">
            Target Spreadsheet ID: <strong className="font-mono text-stone-300 shrink-0 select-all">{settings.spreadsheetId}</strong>
          </span>
        </div>
        
        {/* State Counters */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-stone-400">Inbox:</span>
          <span className="flex items-center gap-1 bg-red-950/20 text-red-400 px-1.5 py-0.5 rounded border border-red-950/50 text-[10px] font-semibold">
            P1: {syncCounts.P1}
          </span>
          <span className="flex items-center gap-1 bg-amber-950/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-950/50 text-[10px] font-semibold">
            P2: {syncCounts.P2}
          </span>
          <span className="flex items-center gap-1 bg-stone-900 text-stone-400 px-1.5 py-0.5 rounded border border-stone-800 text-[10px] font-semibold">
            P3: {syncCounts.P3}
          </span>
        </div>
      </section>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-red-950/20 border-b border-red-500/20 text-red-400 px-6 py-3 text-xs font-sans font-medium flex items-center gap-2 z-10 shrink-0">
          <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto underline hover:opacity-80">Dismiss</button>
        </div>
      )}

      {/* Two Panel Layout Container */}
      <main className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        
        {/* Left Panel: Lists (Takes 1/3 or 400px of screen) */}
        <aside className="w-full max-w-sm shrink-0 h-full flex flex-col min-w-0">
          <EmailList
            emails={emails}
            selectedEmailId={selectedEmailId}
            onSelectEmail={setSelectedEmailId}
            isLoading={isSyncing}
          />
        </aside>

        {/* Right Panel: Detail view & Actions */}
        <section className="flex-1 h-full flex flex-col min-w-0">
          <EmailDetail
            email={activeEmail}
            onSendReply={handleSendReply}
            isSending={isSending}
          />
        </section>

      </main>

      {/* Settings Drawer Slideover overlay */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={onSaveSettings}
        accessToken={accessToken}
      />

    </div>
  );
}
