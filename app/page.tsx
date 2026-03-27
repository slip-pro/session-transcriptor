"use client";

import { useMemo, useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coachName, setCoachName] = useState("");
  const [clientName, setClientName] = useState("");
  const [sessionDate, setSessionDate] = useState("");

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

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let message = "Не получилось обработать файл.";
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
      setError(e instanceof Error ? e.message : "Неожиданная ошибка");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-rose-50 via-amber-50 to-sky-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16 sm:py-20">
        <header className="flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm text-zinc-700 ring-1 ring-zinc-900/5 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            Транскрипт коуч‑сессии за пару минут
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Загрузи аудио — получишь транскрипт в формате ICF
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-700">
            Мини‑интерфейс для коучей и психологов: отправляешь запись, движок
            делает расшифровку, а ты скачиваешь готовый файл Word.
          </p>
        </header>

        <section className="rounded-2xl bg-white/80 p-5 ring-1 ring-zinc-900/5 backdrop-blur sm:p-6">
          <form className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">Коуч</span>
                <input
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="Напр. Александра"
                  className="h-11 rounded-xl bg-white px-4 text-sm text-zinc-800 ring-1 ring-zinc-900/10 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">Клиент</span>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Напр. Ирина"
                  className="h-11 rounded-xl bg-white px-4 text-sm text-zinc-800 ring-1 ring-zinc-900/10 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">Дата</span>
                <input
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  placeholder="2026-03-26"
                  className="h-11 rounded-xl bg-white px-4 text-sm text-zinc-800 ring-1 ring-zinc-900/10 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-800">
                Аудио‑файл (mp3, m4a, wav)
              </span>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full cursor-pointer rounded-xl bg-white px-4 py-3 text-sm text-zinc-800 ring-1 ring-zinc-900/10 file:mr-4 file:rounded-lg file:border-0 file:bg-rose-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-rose-900 hover:ring-zinc-900/15 focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </label>

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
                {isLoading ? "Обрабатываю…" : "Сделать транскрипт (ICF)"}
              </button>
              <p className="text-sm text-zinc-600">
                Сейчас делаем распознавание через Deepgram и скачиваем Word.
              </p>
            </div>
          </form>
        </section>

        <footer className="text-sm text-zinc-600">
          <p>
            Конфиденциальность и хранение данных добавим позже — сейчас делаем
            первую рабочую версию интерфейса.
          </p>
        </footer>
      </main>
    </div>
  );
}
