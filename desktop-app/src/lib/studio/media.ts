import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ShotInput = z.object({
  channelName: z.string().min(1).max(80),
  look: z.string().min(1).max(900),
  title: z.string().min(1).max(180),
  hook: z.string().max(700),
  visual: z.string().max(900),
  script: z.string().max(1800),
  aspect: z.enum(["16:9", "9:16"]),
  duration: z.number().int().min(6).max(15),
  resolution: z.enum(["720p", "1080p"]),
});

const PollInput = z.object({
  requestId: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
});

const CoverInput = z.object({
  look: z.string().min(1).max(900),
  title: z.string().min(1).max(180),
  headline: z.string().max(120),
  composition: z.string().max(240),
});

const RewriteInput = z.object({
  channelName: z.string().min(1).max(80),
  niche: z.string().max(400),
  voice: z.string().max(500),
  title: z.string().min(1).max(180),
  hook: z.string().max(700),
  pillar: z.string().max(80),
});

function fallbackPrompt(data: z.infer<typeof ShotInput>): string {
  return [
    `Photoreal cinematic opener, ${data.duration} seconds, ${data.aspect}, no on-screen text, no subtitles, no logos, no watermark, no letters anywhere.`,
    data.look,
    `Scene: ${data.visual || data.title}.`,
    `Story beat: ${data.hook}`,
    "One continuous motivated camera move. Natural imperfect detail. Diegetic sound only, no voiceover, no music sting. No cuts to graphics.",
  ]
    .join(" ")
    .slice(0, 1800);
}

async function craftPrompt(apiKey: string, data: z.infer<typeof ShotInput>): Promise<string> {
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.4,
        max_tokens: 420,
        messages: [
          {
            role: "system",
            content:
              "You write one video-generation prompt in English. 130-190 words. Photoreal, cinematic, continuous action across the given duration. Specify lens, light, weather, sound, and how the camera moves from the first second to the last. No on-screen text, subtitles, logos, watermarks, or title cards. No mention of YouTube. Diegetic audio only unless the scene clearly needs a quiet room tone. Output the prompt only.",
          },
          {
            role: "user",
            content: `Channel: ${data.channelName}\nLook: ${data.look}\nTitle: ${data.title}\nHook: ${data.hook}\nVisual note: ${data.visual}\nScript excerpt: ${data.script.slice(0, 700)}\nAspect: ${data.aspect}\nSeconds: ${data.duration}`,
          },
        ],
      }),
    });
    if (!res.ok) return fallbackPrompt(data);
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "");
    if (!text || text.length < 80) return fallbackPrompt(data);
    return text.slice(0, 1800);
  } catch {
    return fallbackPrompt(data);
  }
}

function apiError(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string; message?: string };
    const msg = typeof parsed.error === "string" ? parsed.error : parsed.error?.message || parsed.message;
    if (msg) return msg.slice(0, 180);
  } catch {
    /* ignore */
  }
  return `Съёмка не стартовала (${status})`;
}

export const startEpisodeVideo = createServerFn({ method: "POST" })
  .validator((input: unknown) => ShotInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Генерация сейчас недоступна" };
    const prompt = await craftPrompt(apiKey, data);
    const res = await fetch("https://api.x.ai/v1/videos/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-imagine-video-1.5",
        prompt,
        duration: data.duration,
        aspect_ratio: data.aspect,
        resolution: data.resolution,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false as const, error: apiError(text, res.status) };
    }
    const body = (await res.json()) as { request_id?: string };
    if (!body.request_id) return { ok: false as const, error: "Площадка не вернула номер съёмки" };
    return { ok: true as const, requestId: body.request_id, prompt };
  });

export const pollEpisodeVideo = createServerFn({ method: "POST" })
  .validator((input: unknown) => PollInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Генерация сейчас недоступна" };
    const res = await fetch(`https://api.x.ai/v1/videos/${data.requestId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { ok: false as const, error: `Не удалось спросить статус (${res.status})` };
    const body = (await res.json()) as {
      status?: string;
      video?: { url?: string };
      error?: { message?: string };
    };
    if (body.status === "done" && body.video?.url) {
      return { ok: true as const, status: "done" as const, url: body.video.url };
    }
    if (body.status === "failed" || body.status === "expired") {
      return { ok: true as const, status: "failed" as const, error: body.error?.message?.slice(0, 180) ?? "Съёмка сорвалась" };
    }
    return { ok: true as const, status: "pending" as const };
  });

export const makeCover = createServerFn({ method: "POST" })
  .validator((input: unknown) => CoverInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Генерация сейчас недоступна" };
    const prompt = `Photoreal photograph, no text, no letters, no logo, no watermark, no border. ${data.look} Subject: ${data.title}. Framing: ${data.composition}. Thumbnail idea without words: ${data.headline}. Natural imperfect detail, cinematic color.`;
    const send = async (extra: Record<string, string>) =>
      fetch("https://api.x.ai/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-imagine-image-quality",
          prompt,
          n: 1,
          resolution: "1k",
          response_format: "url",
          ...extra,
        }),
      });
    let res = await send({ aspect_ratio: "16:9" });
    if (!res.ok) res = await send({});
    if (!res.ok) return { ok: false as const, error: "Кадр обложки не собрался" };
    const body = (await res.json()) as { data?: { url?: string }[] };
    const url = body.data?.[0]?.url;
    if (!url) return { ok: false as const, error: "Кадр пришёл без ссылки" };
    return { ok: true as const, url };
  });

export const rewriteEpisode = createServerFn({ method: "POST" })
  .validator((input: unknown) => RewriteInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Генерация сейчас недоступна" };
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.7,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "Ты редактор независимого YouTube-канала. Пиши по-русски, без кликбейта, без «вы не поверите», без призыва подписаться в первой фразе. Верни только JSON с полями title, hook, script, description, tags (массив коротких слов), thumb (3-5 слов для кадра, без кавычек-кричалок). script — готовый текст выпуска из холодного открытия, трёх блоков и тихого выхода. 350-600 слов.",
          },
          {
            role: "user",
            content: `Канал: ${data.channelName}\nНиша: ${data.niche}\nГолос: ${data.voice}\nСтолп: ${data.pillar}\nСейчас заголовок: ${data.title}\nСейчас хук: ${data.hook}`,
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: "Редактор не ответил" };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = body.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as {
        title?: string;
        hook?: string;
        script?: string;
        description?: string;
        tags?: unknown;
        thumb?: string;
      };
      if (!parsed.title || !parsed.script) return { ok: false as const, error: "Ответ редактора не собрался" };
      const tags = Array.isArray(parsed.tags) ? parsed.tags.map((tag) => String(tag)).slice(0, 12) : [];
      return {
        ok: true as const,
        rewrite: {
          title: String(parsed.title).slice(0, 180),
          hook: String(parsed.hook ?? "").slice(0, 500),
          script: String(parsed.script).slice(0, 6000),
          description: String(parsed.description ?? "").slice(0, 1200),
          tags,
          thumb: String(parsed.thumb ?? "").slice(0, 80),
        },
      };
    } catch {
      return { ok: false as const, error: "Ответ редактора не собрался" };
    }
  });
