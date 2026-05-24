'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Layers,
  Map,
  Coins,
  ShieldCheck,
  UserCheck,
  FileSpreadsheet,
  LineChart,
  GitMerge,
  ArrowRight,
  Globe2,
} from 'lucide-react';

interface FutureFeature {
  title: string;
  description: string;
  icon: React.ElementType;
  phase: 'Version C (Dubai Premium)' | 'Version A (Enterprise Operations)';
  timeline: string;
  complexity: 'Medium' | 'High' | 'Very High';
  color: string;
  bgColor: string;
}

const FUTURE_FEATURES: FutureFeature[] = [
  // Version C
  {
    title: 'Nationality-Based Greeting Adaptation',
    description: 'AI automatically adapts message templates to lead nationalities. Seamlessly translates greetings and property specs to Arabic 🇦🇪, Russian 🇷🇺, French 🇫🇷, and Hindi 🇮🇳 to foster instant rapport.',
    icon: Globe2,
    phase: 'Version C (Dubai Premium)',
    timeline: 'Q3 2026',
    complexity: 'Medium',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    title: 'Interactive Geography Heat Map',
    description: 'Real-time interactive spatial map overlays pinpointing lead density, properties searched, and financial activity clusters across major Dubai master projects (Palm Jumeirah, Downtown, Dubai Hills).',
    icon: Map,
    phase: 'Version C (Dubai Premium)',
    timeline: 'Q3 2026',
    complexity: 'High',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    title: 'Revenue Pipeline Estimations',
    description: 'Calculates active prospective pipeline value dynamically. Combines intentionality multipliers, property types, and budget tiers to output expected closed volumes for cash forecasting.',
    icon: Coins,
    phase: 'Version C (Dubai Premium)',
    timeline: 'Q4 2026',
    complexity: 'Medium',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    title: 'Owner vs. Tenant Portfolio Profiling',
    description: 'Deeper client classification tracking assets currently owned in Dubai, tenancy expiration alerts, lease status tracking, and secondary resale intention markers.',
    icon: UserCheck,
    phase: 'Version C (Dubai Premium)',
    timeline: 'Q4 2026',
    complexity: 'Medium',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10 border-pink-500/20',
  },
  // Version A
  {
    title: 'Agent Performance Dashboards & Leaderboards',
    description: 'Operational analytics tracking agent lead response times, communication frequency, pipeline conversions, and campaign ROI metrics. Includes gamified weekly leaderboards.',
    icon: LineChart,
    phase: 'Version A (Enterprise Operations)',
    timeline: 'Q1 2027',
    complexity: 'High',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    title: 'Advanced Drag-and-Drop Column Mapper',
    description: 'Universal smart Excel/CSV importer allowing administrators to import custom spreadsheets of any structure and map headers (e.g. "Customer Number" to "phone") via a visual node map.',
    icon: FileSpreadsheet,
    phase: 'Version A (Enterprise Operations)',
    timeline: 'Q1 2027',
    complexity: 'Very High',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    title: 'Import Audit Logs & Duplicate Center',
    description: 'Historical logging of all file uploads. Allows rollbacks, deduplicates database contacts fuzzy-matching names and phone lengths, and auto-merges messaging histories.',
    icon: GitMerge,
    phase: 'Version A (Enterprise Operations)',
    timeline: 'Q2 2027',
    complexity: 'High',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
  },
];

export default function ComingSoonRoadmapPage() {
  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="relative p-8 rounded-2xl border border-border/50 bg-card/25 backdrop-blur-md overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-8 text-primary/10 opacity-30 select-none pointer-events-none">
          <Sparkles className="w-48 h-48 animate-pulse" />
        </div>
        <div className="space-y-2 relative z-10">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-xs px-3 py-1 font-bold">
            🔮 CRM ROADMAP
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight">Future Phases & Features</h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            A strategic glimpse into the upcoming **Dubai Premium (Version C)** and **Enterprise Operations (Version A)** phases to supercharge agent productivity.
          </p>
        </div>
        <div className="relative z-10 shrink-0 flex items-center gap-3 bg-muted/20 border border-border/40 p-4 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Version B MVP Status</p>
            <p className="text-sm font-bold text-emerald-400">98% Completed (Beta)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Column: Version C (Dubai Premium) */}
        <div className="space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Phase 1: Dubai Premium (Version C)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">High-end customer personalization & spatial deal analytics</p>
            </div>
          </div>

          <div className="space-y-4">
            {FUTURE_FEATURES.filter(f => f.phase === 'Version C (Dubai Premium)').map((feat) => {
              const Icon = feat.icon;
              return (
                <Card key={feat.title} className="border-border/50 bg-card/20 hover:border-border/80 hover:bg-card/30 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-[10px] text-muted-foreground/40 font-mono">
                    {feat.timeline}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${feat.bgColor}`}>
                        <Icon className={`w-4 h-4 ${feat.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground group-hover:text-primary transition-colors pr-10">{feat.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-violet-500/15 text-violet-400 border-violet-500/20">
                            Version C
                          </Badge>
                          <span className="text-[9px] text-muted-foreground/60">Complexity: <strong className="text-foreground/80 font-medium">{feat.complexity}</strong></span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground/90 leading-relaxed font-sans">{feat.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Column: Version A (Enterprise Operations) */}
        <div className="space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Phase 2: Enterprise Operations (Version A)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Scale-up, compliance logs, drag column map & leaderboards</p>
            </div>
          </div>

          <div className="space-y-4">
            {FUTURE_FEATURES.filter(f => f.phase === 'Version A (Enterprise Operations)').map((feat) => {
              const Icon = feat.icon;
              return (
                <Card key={feat.title} className="border-border/50 bg-card/20 hover:border-border/80 hover:bg-card/30 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-[10px] text-muted-foreground/40 font-mono">
                    {feat.timeline}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${feat.bgColor}`}>
                        <Icon className={`w-4 h-4 ${feat.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground group-hover:text-primary transition-colors pr-10">{feat.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-blue-500/15 text-blue-400 border-blue-500/20">
                            Version A
                          </Badge>
                          <span className="text-[9px] text-muted-foreground/60">Complexity: <strong className="text-foreground/80 font-medium">{feat.complexity}</strong></span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground/90 leading-relaxed font-sans">{feat.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer / CTA Card */}
      <Card className="border-border/50 bg-gradient-to-r from-primary/10 via-background/40 to-background/90 text-center p-8 rounded-2xl relative overflow-hidden">
        <div className="space-y-3 relative z-10 max-w-xl mx-auto">
          <h3 className="text-lg font-bold">Have feature requests or feedback?</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We are designing the Dubai Real Estate CRM to adapt precisely to your operational workflow. Let your administrator know of any specific integrations (such as local listing portals, property management solutions, or private phone systems) you would like to request.
          </p>
          <div className="pt-2 flex justify-center">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
            >
              Back to Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
