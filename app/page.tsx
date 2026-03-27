"use client";

import { useMemo, useState } from "react";

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
    donateText: "Если вам понравился сервис, вы можете поддержать автора: ",
    donateRub: "поддержать в рублях",
    donateEur: "поддержать в евро",
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
    donateText: "If you found this tool helpful, you can support the creator: ",
    donateRub: "support in RUB",
    donateEur: "support in EUR",
    unexpectedError: "Unexpected error",
    defaultError: "Could not process the file.",
  },
} as const;

type Lang = keyof typeof translations;

export default function Home() {
  const [lang, setLang] = useState<Lang>("ru");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coachName, setCoachName] = useState("");
  const [clientName, setClientName] = useState("");
  const [sessionDate, setSessionDate] = useState("");

  const t = translations[lang];
  const canSubmit = useMemo(() => !!file && !isLoading, [file, isLoading]);

  async function onTranscribe() {
    if (!file || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onTranscribe}
                disabled={!canSubmit}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm transition enabled:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative inline-flex items-center justify-center">
                  <span className={isLoading ? "invisible" : ""}>{t.submit}</span>
                  <span className={`absolute inset-0 flex items-center justify-center${isLoading ? "" : " invisible"}`}>{t.submitting}</span>
                </span>
              </button>
              <p className="text-sm text-zinc-600">{t.hint}</p>
            </div>
          </form>
        </section>

        <footer className="flex flex-col gap-2 text-sm text-zinc-600">
          <p>{t.footer}</p>
          <p>
            {t.donateText}
            <a
              href="https://www.tinkoff.ru/rm/r_GWWuGKdimU.gmQAaLNhPZ/p6XLD28818"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-zinc-900"
            >
              {t.donateRub}
            </a>
            {" · "}
            <a
              href="https://revolut.me/aleksaue7s/pocket/IJ2bd9k6na"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-zinc-900"
            >
              {t.donateEur}
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
