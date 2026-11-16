export type Autonomy = "auto" | "approve" | "draft";
export type Stage = "idea" | "script" | "package" | "queued" | "live";
export type Aspect = "16:9" | "9:16";
export type Resolution = "720p" | "1080p";

export type Shot = {
  aspect: Aspect;
  duration: number;
  resolution: Resolution;
};

export type VideoJob = {
  requestId: string;
  status: "pending" | "done" | "failed";
  url?: string;
  prompt?: string;
  error?: string;
  aspect: Aspect;
  duration: number;
  resolution: Resolution;
  startedAt: number;
};

export type Take = { url: string; at: number };

export type Thumb = { headline: string; composition: string };

export type Channel = {
  id: string;
  name: string;
  handle: string;
  niche: string;
  voice: string;
  look: string;
  pillars: string[];
  days: number[];
  hour: number;
  autonomy: Autonomy;
  paused: boolean;
  autoShoot: boolean;
  subscribers: number;
  format: string;
  custom?: boolean;
};

export type Episode = {
  id: string;
  channelId: string;
  title: string;
  pillar: string;
  stage: Stage;
  hook: string;
  script: string;
  description: string;
  tags: string[];
  thumb: Thumb;
  visual: string;
  durationMin: number;
  scheduledAt: number | null;
  publishedAt: number | null;
  needsApproval: boolean;
  stats: { views: number; ctr: number; avgPct: number; likes: number } | null;
  shot?: Shot;
  video?: VideoJob;
  takes?: Take[];
  coverUrl?: string;
};

export type LogLine = {
  id: string;
  at: number;
  channelId: string;
  text: string;
};

export type StudioState = {
  channels: Channel[];
  episodes: Episode[];
  log: LogLine[];
  cursor: number;
  lastBeatAt: number;
  shootQueue: string[];
};

export type Idea = {
  title: string;
  pillar: string;
  hook: string;
  open: string;
  visual: string;
  beats: [string, string, string];
  end: string;
  thumb: string;
  composition: string;
  tags: string[];
  minutes: number;
};
