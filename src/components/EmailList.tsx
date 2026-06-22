import { useState, useMemo } from 'react';
import { CombinedEmail, Priority } from '../types';
import { Search, Filter, AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface EmailListProps {
  emails: CombinedEmail[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
  isLoading: boolean;
}

export default function EmailList({
  emails,
  selectedEmailId,
  onSelectEmail,
  isLoading,
}: EmailListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Filter and sort emails
  // Priority sorting: P1 (Red) > P2 (Yellow) > P3 (Gray) > Unscheduled / Unmatched
  const processedEmails = useMemo(() => {
    let filtered = emails.filter((mail) => {
      // Search matching
      const content = `${mail.gmail.subject} ${mail.gmail.fromName} ${mail.gmail.fromEmail} ${mail.gmail.snippet}`.toLowerCase();
      const matchesSearch = content.includes(searchQuery.toLowerCase());
      
      // Filter matching
      if (priorityFilter === 'ALL') return matchesSearch;
      return matchesSearch && mail.priority === priorityFilter;
    });

    // Custom sorting priority logic
    const priorityWeights: Record<Priority, number> = {
      P1: 3,
      P2: 2,
      P3: 1,
    };

    return [...filtered].sort((a, b) => {
      const weightA = priorityWeights[a.priority] || 0;
      const weightB = priorityWeights[b.priority] || 0;
      
      if (weightA !== weightB) {
        return weightB - weightA; // Higher weight comes first
      }
      
      // Fallback to date sorting if priorities match
      const dateA = new Date(a.gmail.date).getTime() || 0;
      const dateB = new Date(b.gmail.date).getTime() || 0;
      return dateB - dateA;
    });
  }, [emails, searchQuery, priorityFilter]);

  const priorityColorClass = (priority: Priority) => {
    switch (priority) {
      case 'P1':
        return {
          border: 'border-l-4 border-red-500 bg-red-950/10 hover:bg-red-950/20',
          badge: 'bg-red-500/10 text-red-400 border border-red-500/30',
          dot: 'bg-red-500 shadow-sm shadow-red-500/50',
        };
      case 'P2':
        return {
          border: 'border-l-4 border-amber-500 bg-amber-950/10 hover:bg-amber-950/20',
          badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
          dot: 'bg-amber-500 shadow-sm shadow-amber-500/50',
        };
      case 'P3':
        return {
          border: 'border-l-4 border-stone-500 bg-stone-900/40 hover:bg-stone-800/40',
          badge: 'bg-stone-800 text-stone-400 border border-stone-750',
          dot: 'bg-stone-500',
        };
    }
  };

  // Convert Date string to short time display
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      // If today, show time. Else, show date.
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="w-full flex flex-col h-full bg-stone-950 border-r border-stone-800">
      {/* Search Header */}
      <div className="p-4 bg-stone-950 space-y-3 border-b border-stone-800/85">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-stone-500" />
          <input
            type="text"
            className="w-full bg-stone-900 border border-stone-800/80 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-stone-700"
            placeholder="Search CEO priority mailbox..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Priority Filter Row */}
        <div className="flex items-center justify-between gap-1 pb-1">
          <span className="text-[10px] uppercase font-mono tracking-widest text-stone-500 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter priority
          </span>
          <div className="flex gap-1.5">
            {['ALL', 'P1', 'P2', 'P3'].map((btn) => (
              <button
                key={btn}
                onClick={() => setPriorityFilter(btn)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                  priorityFilter === btn
                    ? 'bg-stone-800 text-stone-100 border border-stone-750'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
                }`}
              >
                {btn === 'ALL' ? 'All' : btn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inbox List Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-stone-900/60">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-500 space-y-2">
            <div className="w-6 h-6 border-2 border-stone-700 border-t-indigo-500 rounded-full animate-spin"></div>
            <span className="text-xs font-mono">Syncing workspace mailbox...</span>
          </div>
        ) : processedEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-stone-500 h-64 space-y-2">
            <CheckCircle className="w-8 h-8 text-stone-600 stroke-[1.2]" />
            <div className="space-y-1">
              <p className="text-stone-300 text-sm font-medium">Clear Inbox, CEO!</p>
              <p className="text-xs text-stone-500 max-w-[200px]">No emails matched your current filters or query.</p>
            </div>
          </div>
        ) : (
          processedEmails.map((email) => {
            const styles = priorityColorClass(email.priority);
            const isSelected = selectedEmailId === email.gmail.id;
            
            return (
              <div
                key={email.gmail.id}
                onClick={() => onSelectEmail(email.gmail.id)}
                className={`relative p-4 cursor-pointer transition flex flex-col gap-1.5 select-none ${styles.border} ${
                  isSelected ? 'bg-stone-900/90 hover:bg-stone-900' : 'bg-stone-950 hover:bg-stone-900/40'
                }`}
              >
                {/* Header row: From & Time */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></span>
                    <span className="font-sans font-medium text-xs text-stone-200 truncate pr-1">
                      {email.gmail.fromName}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 shrink-0">
                    {formatTime(email.gmail.date)}
                  </span>
                </div>

                {/* Subject row */}
                <h4 className={`text-xs text-stone-100 line-clamp-1 pr-4 leading-tight ${
                  isSelected ? 'font-semibold' : 'font-medium'
                }`}>
                  {email.gmail.subject}
                </h4>

                {/* Snippet preview */}
                <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed">
                  {email.gmail.snippet}
                </p>

                {/* Sub-tags and Details indicators */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${styles.badge}`}>
                    {email.priority}
                  </span>
                  
                  {email.profile?.company && (
                    <span className="text-[9px] bg-stone-900 text-stone-400 px-1.5 py-0.5 rounded border border-stone-850 truncate max-w-[120px]">
                      {email.profile.company}
                    </span>
                  )}

                  {email.summary ? (
                    <span className="text-[9px] text-emerald-400 bg-emerald-950/10 border border-emerald-950/40 px-1.5 py-0.5 rounded font-mono">
                      Synced
                    </span>
                  ) : (
                    <span className="text-[9px] text-stone-500 font-mono italic">
                      Live
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
