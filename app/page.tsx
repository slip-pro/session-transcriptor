"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useState } from "react";

const pageTitles = {
  ru: "Coaching Session Transcriptor",
  en: "Coaching Session Transcriptor",
};

const translations = {
  ru: {
    badge: "Транскрипт коуч‑сессии за пару минут",
    heading: "Загрузи аудио — получишь транскрипт в формате ICF",
    description:
      "Мини‑интерфейс для коучей и психологов: отправляешь запись, движок делает расшифровку, а ты скачиваешь готовый файл Word.",
    coach: "Коуч",
    coachPlaceholder: "Напр. Александра",
    client: "Клиент",
    clientPlaceholder: "Напр. Ирина",
    date: "Дата",
    audioLabel: "Аудио‑файл (mp3, m4a, wav)",
    chooseFile: "Выбрать файл",
    noFile: "Файл не выбран",
    submit: "Сделать транскрипт",
    submitting: "Обрабатываю…",
    hint: "",
    footer:
      "Аудио не сохраняется — файл обрабатывается в памяти и удаляется сразу после расшифровки. Распознавание речи выполняется через Deepgram.",
    authorLabel: "Создатель сервиса",
    authorName: "Александра Липчанская",
    authorBio: "ACC ICF, вице-президент ICF Cyprus, куратор программ Erickson Cyprus",
    donateText: "Если вам понравился сервис, вы можете поддержать автора: ",
    donateRub: "поддержать в рублях",
    donateEur: "поддержать в евро",
    uploading: "Загружаю файл…",
    unexpectedError: "Неожиданная ошибка",
    defaultError: "Не получилось обработать файл.",
  },
  en: {
    badge: "Coaching session transcript in minutes",
    heading: "Upload audio — get an ICF-format transcript",
    description:
      "A simple tool for coaches and therapists: upload a recording, the engine transcribes it, and you download a ready Word file.",
    coach: "Coach",
    coachPlaceholder: "E.g. Alexandra",
    client: "Client",
    clientPlaceholder: "E.g. Irina",
    date: "Date",
    audioLabel: "Audio file (mp3, m4a, wav)",
    chooseFile: "Choose file",
    noFile: "No file selected",
    submit: "Create transcript",
    submitting: "Processing…",
    hint: "",
    footer:
      "Audio is not stored — your file is processed in memory and discarded immediately after transcription. Speech recognition is powered by Deepgram.",
    authorLabel: "Created by",
    authorName: "Alexandra Lipchanskaya",
    authorBio: "ACC ICF, VP of ICF Cyprus, Program Curator at Erickson Cyprus",
    donateText: "If you found this tool helpful, you can support the creator: ",
    donateRub: "support in RUB",
    donateEur: "support in EUR",
    uploading: "Uploading file…",
    unexpectedError: "Unexpected error",
    defaultError: "Could not process the file.",
  },
} as const;

type Lang = keyof typeof translations;

export default function Home() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof navigator !== "undefined" && !navigator.language.startsWith("ru")) {
      return "en";
    }
    return "ru";
  });
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coachName, setCoachName] = useState("");
  const [clientName, setClientName] = useState("");
  const [sessionDate, setSessionDate] = useState("");

  const t = translations[lang];
  const canSubmit = useMemo(() => !!file && !isLoading && !isUploading, [file, isLoading, isUploading]);

  useEffect(() => {
    document.title = pageTitles[lang];
  }, [lang]);

  async function onTranscribe() {
    if (!file || isLoading) return;

    setIsLoading(true);
    setIsUploading(true);
    setError(null);

    let blobUrl: string;
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      blobUrl = blob.url;
    } catch {
      setError(t.defaultError);
      setIsLoading(false);
      setIsUploading(false);
      return;
    }
    setIsUploading(false);

    try {
      const formData = new FormData();
      formData.append("blobUrl", blobUrl);
      formData.append("coachName", coachName);
      formData.append("clientName", clientName);
      formData.append("sessionDate", sessionDate);
      formData.append("lang", lang);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let message: string = t.defaultError;
        try {
          const data = (await res.json()) as { error?: string };
          if (data?.error) message = data.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "transcript-icf.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.unexpectedError);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-rose-50 via-amber-50 to-sky-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16 sm:py-20">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm text-zinc-700 ring-1 ring-zinc-900/5 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              {t.badge}
            </div>
            <button
              type="button"
              onClick={() => setLang(lang === "ru" ? "en" : "ru")}
              className="rounded-full bg-white/70 px-3 py-1 text-sm font-medium text-zinc-700 ring-1 ring-zinc-900/5 backdrop-blur transition hover:bg-white"
            >
              {lang === "ru" ? "EN" : "RU"}
            </button>
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {t.heading}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-700">
            {t.description}
          </p>
        </header>

        <section className="rounded-2xl bg-white/80 p-5 ring-1 ring-zinc-900/5 backdrop-blur sm:p-6">
          <form className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">{t.coach}</span>
                <input
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder={t.coachPlaceholder}
                  className="h-11 rounded-xl bg-white px-4 text-sm text-zinc-800 ring-1 ring-zinc-900/10 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">{t.client}</span>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t.clientPlaceholder}
                  className="h-11 rounded-xl bg-white px-4 text-sm text-zinc-800 ring-1 ring-zinc-900/10 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">{t.date}</span>
                <input
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  placeholder="2026-03-26"
                  className="h-11 rounded-xl bg-white px-4 text-sm text-zinc-800 ring-1 ring-zinc-900/10 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-800">
                {t.audioLabel}
              </span>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm text-zinc-800 ring-1 ring-zinc-900/10 hover:ring-zinc-900/20 focus-within:ring-2 focus-within:ring-rose-300">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
                <span className="shrink-0 rounded-lg bg-rose-100 px-3 py-1.5 text-sm font-medium text-rose-900">
                  {t.chooseFile}
                </span>
                <span className="truncate text-zinc-500">
                  {file ? file.name : t.noFile}
                </span>
              </label>
            </div>

            {error ? (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900 ring-1 ring-rose-200">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={onTranscribe}
              disabled={!canSubmit}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm transition enabled:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <span className="relative inline-flex items-center justify-center">
                <span className={isLoading || isUploading ? "invisible" : ""}>{t.submit}</span>
                <span className={`absolute inset-0 flex items-center justify-center${isUploading ? "" : " invisible"}`}>{t.uploading}</span>
                <span className={`absolute inset-0 flex items-center justify-center${isLoading && !isUploading ? "" : " invisible"}`}>{t.submitting}</span>
              </span>
            </button>
          </form>
        </section>

        <footer className="flex flex-col gap-3 text-sm text-zinc-600">
          <p>{t.footer}</p>
          <p>
            {t.authorLabel}{" — "}
            <span className="font-medium text-zinc-800">{t.authorName}</span>
            {", "}
            {t.authorBio}
          </p>
          <p>
            {t.donateText}
            <a
              href="https://www.tinkoff.ru/rm/r_GWWuGKdimU.gmQAaLNhPZ/p6XLD28818"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 hover:text-zinc-900"
            >
              {t.donateRub}
            </a>
            {" · "}
            <a
              href="https://revolut.me/aleksaue7s/pocket/IJ2bd9k6na"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 hover:text-zinc-900"
            >
              {t.donateEur}
            </a>
          </p>
          <div className="flex items-center gap-3">
            <a href="https://t.me/alipchanskaya" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-700 transition" aria-label="Telegram">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </a>
            <a href="https://www.instagram.com/alexandra.lipchanskaya" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-700 transition" aria-label="Instagram">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
            </a>
            <a href="https://www.linkedin.com/in/alipchanskaya" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-700 transition" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
