'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, Bot, Check, CheckCheck, Phone, Video, Info, 
  Search, Sparkles, CheckCircle2 
} from 'lucide-react';

// Type definitions for Mock UI
interface MockChat {
  id: string;
  name: string;
  avatarLetter: string;
  avatarColor: string;
  phone: string;
  area: string;
  score: number;
  intent: 'buy' | 'invest' | 'sell';
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  isAiActive: boolean;
  status: 'typing' | 'online' | 'offline';
}

const mockChats: MockChat[] = [
  {
    id: '1',
    name: 'Elena Morozova',
    avatarLetter: 'E',
    avatarColor: 'from-pink-500 to-rose-500',
    phone: '+971 52 423 4024',
    area: 'Palm Jumeirah',
    score: 92,
    intent: 'invest',
    unreadCount: 0,
    lastMessage: 'Perfect, I will review the off-plan units list.',
    lastMessageTime: '12:44 PM',
    isAiActive: true,
    status: 'online'
  },
  {
    id: '2',
    name: 'ahmed mohammed',
    avatarLetter: 'A',
    avatarColor: 'from-violet-500 to-indigo-500',
    phone: '+90 535 021 5375',
    area: 'USA / JVC',
    score: 85,
    intent: 'buy',
    unreadCount: 2,
    lastMessage: 'Is there a payment plan for the JVC townhouse?',
    lastMessageTime: '11:15 AM',
    isAiActive: true,
    status: 'typing'
  },
  {
    id: '3',
    name: 'Rajesh Patel',
    avatarLetter: 'R',
    avatarColor: 'from-amber-500 to-orange-500',
    phone: '+971 50 823 4008',
    area: 'Dubai Hills Estate',
    score: 74,
    intent: 'buy',
    unreadCount: 0,
    lastMessage: 'Can we schedule a viewing this Saturday?',
    lastMessageTime: 'Yesterday',
    isAiActive: false,
    status: 'offline'
  },
  {
    id: '4',
    name: 'Sarah Mitchell',
    avatarLetter: 'S',
    avatarColor: 'from-emerald-500 to-teal-500',
    phone: '+971 50 423 4004',
    area: 'DIFC',
    score: 62,
    intent: 'buy',
    unreadCount: 0,
    lastMessage: 'Thanks for the brochures. Will check with my bank.',
    lastMessageTime: '2 days ago',
    isAiActive: false,
    status: 'offline'
  }
];

export default function ConversationsPage() {
  const [activeChat, setActiveChat] = useState<MockChat>(mockChats[0]);


  return (
    <div className="relative min-h-[calc(100vh-140px)] w-full overflow-hidden rounded-2xl border border-border/40 bg-background/50">
      
      {/* 1. STUNNING, RENDERED LIVE PREVIEW BACKGROUND DASHBOARD (BLURRED) */}
      <div className="absolute inset-0 flex select-none opacity-40 blur-[4px] filter transition-all duration-700 pointer-events-none">
        
        {/* Left Chats List Sidebar */}
        <div className="w-[320px] shrink-0 border-r border-border/40 bg-card/10 flex flex-col">
          <div className="p-4 border-b border-border/30">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
              <div className="w-full h-9 rounded-md bg-muted/20 border border-border/20 pl-9 flex items-center text-xs text-muted-foreground/45">
                Search threads...
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {mockChats.map(chat => (
              <div 
                key={chat.id} 
                className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${
                  chat.id === activeChat.id ? 'bg-primary/5 border border-primary/10' : 'hover:bg-muted/10'
                }`}
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${chat.avatarColor} flex items-center justify-center font-bold text-white text-sm`}>
                  {chat.avatarLetter}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground/80 truncate">{chat.name}</span>
                    <span className="text-[10px] text-muted-foreground/60">{chat.lastMessageTime}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/75 truncate mt-0.5">{chat.lastMessage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Central Chat Screen */}
        <div className="flex-1 flex flex-col bg-card/5">
          {/* Chat Header */}
          <div className="h-16 border-b border-border/30 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${activeChat.avatarColor} flex items-center justify-center font-bold text-white text-sm`}>
                {activeChat.avatarLetter}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground/80">{activeChat.name}</h3>
                  {activeChat.isAiActive && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-medium flex items-center gap-1 animate-pulse">
                      <Bot className="w-2.5 h-2.5" /> AI ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/60">{activeChat.phone} • {activeChat.area}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground/50">
              <Phone className="w-4 h-4" />
              <Video className="w-4 h-4" />
              <Info className="w-4 h-4" />
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {/* Outbound Campaign Template message */}
            <div className="flex justify-start max-w-[70%]">
              <div className="bg-muted/15 border border-border/20 p-3 rounded-2xl rounded-tl-none">
                <p className="text-xs text-foreground/70 leading-relaxed">
                  Hi Elena! It's Carlos from Dubai Premium Properties. We just launched a premium villa project on Palm Jumeirah with high ROI. Interested?
                </p>
                <div className="text-[9px] text-muted-foreground/50 text-right mt-1.5 flex items-center justify-end gap-0.5">
                  10:15 AM <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                </div>
              </div>
            </div>

            {/* Inbound Lead Reply message */}
            <div className="flex justify-end max-w-[70%] ml-auto">
              <div className="bg-primary/10 border border-primary/25 p-3 rounded-2xl rounded-tr-none">
                <p className="text-xs text-foreground/85 leading-relaxed">
                  Hi Carlos! Yes, I am actively looking for luxury investments in Dubai. Could you send me the payment plan and layouts?
                </p>
                <span className="block text-[9px] text-muted-foreground/50 text-right mt-1.5">10:45 AM</span>
              </div>
            </div>

            {/* Outbound AI-Suggested Reply */}
            <div className="flex justify-start max-w-[70%]">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl rounded-tl-none relative group">
                <span className="absolute -top-2.5 right-3 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-bold tracking-wider flex items-center gap-1 shadow-md shadow-emerald-500/20">
                  <Sparkles className="w-2.5 h-2.5" /> AI COPILOT
                </span>
                <p className="text-xs text-foreground/80 leading-relaxed mt-0.5">
                  I will prepare the exclusive brochure, floor plans, and a custom 60/40 payment plan for you immediately. What is your approximate target budget tier?
                </p>
                <div className="text-[9px] text-emerald-400/70 text-right mt-1.5 flex items-center justify-end gap-0.5">
                  10:46 AM <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Chat Footer Box */}
          <div className="p-4 border-t border-border/30 bg-muted/10 flex items-center gap-3">
            <div className="flex-1 h-9 rounded-md bg-muted/15 border border-border/20 px-3 flex items-center text-xs text-muted-foreground/40">
              Type a reply or press '/' to query AI suggestions...
            </div>
            <div className="w-9 h-9 rounded-md bg-primary/20 flex items-center justify-center text-primary/60">
              <Send className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Right Copilot Auditor Sidebar */}
        <div className="w-[280px] shrink-0 border-l border-border/40 bg-card/10 p-5 flex flex-col gap-6">
          <div className="text-center pb-4 border-b border-border/30">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 mx-auto flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-500/20">
              92
            </div>
            <h4 className="font-bold text-xs text-foreground/85 mt-2">HOT Prospect Identified</h4>
            <p className="text-[10px] text-muted-foreground/60">Score recalculates in real-time</p>
          </div>
          <div className="space-y-4">
            <h5 className="text-[11px] font-bold tracking-wider text-muted-foreground/80">AI DESIRED PROFILE</h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs p-2 rounded bg-muted/10">
                <span className="text-muted-foreground/70">Intent:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> invest</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded bg-muted/10">
                <span className="text-muted-foreground/70">Area:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Palm Jumeirah</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded bg-muted/10">
                <span className="text-muted-foreground/70">Budget:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> 10M+</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PREMIUM GLASSMORPHIC "COMING SOON" LAUNCHER CARD OVERLAY */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        
        {/* Glow ambient background rings */}
        <div className="absolute w-[450px] h-[450px] rounded-full bg-violet-600/10 blur-[100px] animate-pulse pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-emerald-500/5 blur-[80px] animate-bounce pointer-events-none" style={{ animationDuration: '8s' }} />

        {/* Central Overlay Box */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-xl w-full border border-border/80 bg-background/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
        >
          
          {/* Neon Top border decorative line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-400" />
          
          {/* Header */}
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/25 text-xs font-bold tracking-wider uppercase shadow-inner animate-pulse">
              <Sparkles className="w-3.5 h-3.5" /> Phase 2 Launching Soon
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent pt-1">
              Conversations Hub & AI Copilot
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              Integrate a full WhatsApp live chat system directly inside your CRM. Live chat syncs, automated AI qualification, and agent handoff templates.
            </p>
          </div>

          <div className="my-8" />

          {/* Product Bullet points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md mx-auto">
            {[
              'Direct Outbound/Inbound WhatsApp Sync',
              '🤖 Real-Time OpenAI Copilot Auditor',
              '💬 Standard WhatsApp Markdown UI Support',
              '⚡ Dynamic Live Agents Alert Desk'
            ].map((bullet, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground/90">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>

        </motion.div>

      </div>

    </div>
  );
}
