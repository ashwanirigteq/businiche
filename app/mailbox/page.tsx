'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Inbox,
  Send,
  RefreshCw,
  Search,
  Mail,
  Clock,
  User,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Server,
} from 'lucide-react';
import Link from 'next/link';

interface MailMessage {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  snippet: string;
  bodyHtml?: string | null;
  bodyText?: string | null;
  date: string;
  folder: 'Inbox' | 'Sent';
  unread: boolean;
}

export default function MailboxPage() {
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [mailboxEmail, setMailboxEmail] = useState('');
  const [incomingHost, setIncomingHost] = useState('');
  const [incomingPort, setIncomingPort] = useState(993);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFolder, setActiveFolder] = useState<'Inbox' | 'Sent'>('Inbox');
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const fetchMailbox = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/mailbox');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      }
      setMailboxEmail(data.mailboxEmail || '');
      setIncomingHost(data.incomingHost || '');
      setIncomingPort(data.incomingPort || 993);
      setUnreadCount(data.unreadCount || 0);
      setMessages(data.messages || []);
      if (!selectedMessage && data.messages?.length > 0) {
        setSelectedMessage(data.messages[0]);
      }
    } catch {
      setError('Failed to connect to incoming email server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedMessage]);

  useEffect(() => {
    fetchMailbox();

    // 15-minute automatic mailbox sync timer
    const timer = setInterval(() => {
      fetchMailbox();
    }, 15 * 60 * 1000);

    return () => clearInterval(timer);
  }, [fetchMailbox]);

  const handleSendCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setSendSuccess(null);
    try {
      const res = await fetch('/api/mailbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          message: composeBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      setSendSuccess(data.message);
      setTimeout(() => {
        setIsComposeOpen(false);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setSendSuccess(null);
        fetchMailbox();
      }, 1200);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setIsSending(false);
    }
  };

  const filteredMessages = messages.filter((m) => {
    const matchesFolder = m.folder === activeFolder;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesFolder;
    return (
      matchesFolder &&
      (m.sender.toLowerCase().includes(q) ||
        m.recipient.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.snippet.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Mail className="w-7 h-7 text-blue-600" />
              <span>Mailbox &amp; Communication Inbox</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                  {unreadCount} New
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Connected Account: <strong className="font-mono text-slate-700">{mailboxEmail || 'Not set'}</strong> · Server: <span className="font-mono text-blue-700">{incomingHost}:{incomingPort}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMailbox}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className="w-3.5 h-3.5 text-blue-600" />}
            >
              Sync Mailbox (15m Auto)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsComposeOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Compose Email
            </Button>
          </div>
        </div>

        {/* Warning if credentials missing */}
        {error && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Link
              href="/profile"
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shrink-0"
            >
              Configure Profile
            </Link>
          </div>
        )}

        {/* Main Mailbox Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-2xl border border-blue-100 shadow-xs overflow-hidden min-h-[600px]">
          {/* Sidebar & Folder Navigation (3 cols) */}
          <div className="lg:col-span-3 border-r border-slate-100 p-4 space-y-4 bg-slate-50/50">
            <Button
              variant="primary"
              size="md"
              className="w-full justify-center"
              onClick={() => setIsComposeOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Message
            </Button>

            <nav className="space-y-1 pt-2">
              <button
                type="button"
                onClick={() => setActiveFolder('Inbox')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeFolder === 'Inbox'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4" />
                  <span>Inbox</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20">
                  {messages.filter((m) => m.folder === 'Inbox').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFolder('Sent')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeFolder === 'Sent'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>Sent Outreach</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
                  {messages.filter((m) => m.folder === 'Sent').length}
                </span>
              </button>
            </nav>

            <div className="pt-6 border-t border-slate-200 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Server className="w-3.5 h-3.5 text-blue-600" />
                <span>IMAP Mail Server</span>
              </div>
              <p>Host: {incomingHost || 'imap.hostinger.com'}</p>
              <p>Port: {incomingPort || 993} (SSL/TLS)</p>
              <Link href="/profile" className="text-blue-600 hover:underline block font-semibold pt-1">
                Edit Settings
              </Link>
            </div>
          </div>

          {/* Message List (4 cols) */}
          <div className="lg:col-span-4 border-r border-slate-100 flex flex-col">
            <div className="p-3 border-b border-slate-100 bg-white">
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading mailbox...</div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No {activeFolder.toLowerCase()} messages logged yet.</div>
              ) : (
                filteredMessages.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMessage(m)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer flex flex-col space-y-1.5 ${
                      selectedMessage?.id === m.id
                        ? 'bg-blue-50/80 border-l-4 border-blue-600'
                        : m.unread
                        ? 'bg-white font-semibold'
                        : 'bg-white/60 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-blue-950 truncate">{activeFolder === 'Sent' ? `To: ${m.recipient}` : `From: ${m.sender}`}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {new Date(m.date).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-800 truncate">{m.subject}</span>
                    <span className="text-[11px] text-slate-500 line-clamp-2">{m.snippet}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Message Detail Viewer (5 cols) */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between overflow-y-auto">
            {selectedMessage ? (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 space-y-2">
                  <h2 className="text-lg font-bold text-blue-950">{selectedMessage.subject}</h2>
                  <div className="flex flex-col text-xs text-slate-500 space-y-1">
                    <p>
                      <strong>From:</strong> {selectedMessage.sender}
                    </p>
                    <p>
                      <strong>To:</strong> {selectedMessage.recipient}
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(selectedMessage.date).toLocaleString()}</span>
                    </p>
                  </div>
                </div>

                {selectedMessage.bodyHtml ? (
                  <div
                    className="p-4 rounded-xl border border-slate-200 bg-white min-h-[300px] overflow-x-auto text-slate-800"
                    dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
                  />
                ) : (
                  <div className="text-xs text-slate-700 leading-relaxed space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100 min-h-[300px] whitespace-pre-wrap font-sans">
                    {selectedMessage.bodyText}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setComposeTo(selectedMessage.sender.match(/<([^>]+)>/)?.[1] || selectedMessage.sender);
                      setComposeSubject(`Re: ${selectedMessage.subject}`);
                      setIsComposeOpen(true);
                    }}
                    leftIcon={<Send className="w-3.5 h-3.5 text-blue-600" />}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400 space-y-2">
                <Mail className="w-10 h-10 text-slate-300" />
                <p className="text-xs font-semibold">Select an email message from the list to view full content.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-2xl w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-blue-950 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Compose Direct Email</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {sendSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{sendSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSendCompose} className="space-y-4">
              <Input
                label="To (Email Address)"
                placeholder="contact@company.com"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
              />
              <Input
                label="Subject"
                placeholder="Partnership Proposal / Project Inquiry"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Message Content
                </label>
                <textarea
                  rows={8}
                  placeholder="Write your email proposal..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsComposeOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isSending}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Send Email
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
