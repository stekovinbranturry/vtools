import { useState } from "react";
import {
  parseExtensionInput,
  resolveExtension,
  buildDownloadUrl,
  buildVsixFilename,
  downloadVsix,
} from "../../lib/marketplace";

type Status = "idle" | "working" | "done" | "error";

const EXAMPLES = [
  "ms-python.python",
  "esbenp.prettier-vscode",
  "dbaeumer.vscode-eslint",
];

export function VsixDownloader() {
  const [input, setInput] = useState("");
  const [version, setVersion] = useState("");
  const [saveAs, setSaveAs] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const busy = status === "working";

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const ref = parseExtensionInput(input);
    if (!ref) {
      setStatus("error");
      setMessage(
        '无法解析输入。请使用 "publisher.extension" 或完整的 Marketplace 链接。',
      );
      return;
    }

    setStatus("working");
    try {
      let resolvedVersion = version.trim();
      let label = `${ref.publisher}.${ref.name}`;

      if (!resolvedVersion) {
        setMessage("正在查询最新版本……");
        const resolved = await resolveExtension(ref);
        resolvedVersion = resolved.version;
        if (resolved.displayName) label = resolved.displayName;
      }

      const url = buildDownloadUrl(ref, resolvedVersion);
      const filename = buildVsixFilename(ref, resolvedVersion);

      setMessage(`正在下载 ${label} v${resolvedVersion} …`);
      await downloadVsix(url, filename, saveAs);

      setStatus("done");
      setMessage(`已开始下载：${filename}`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "下载失败，请重试。");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form onSubmit={handleDownload} className="glass rounded-3xl p-6 sm:p-8">
        <label className="mb-2 block text-sm font-medium text-white/70">
          扩展名称或 Marketplace 链接
        </label>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ms-python.python"
          autoFocus
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-white/40 focus:bg-white/10"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/40">示例：</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setInput(ex)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 transition hover:bg-white/15 hover:text-white"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              版本（可选，留空取最新）
            </label>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="latest"
              className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-white/40 focus:bg-white/10"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3 self-end rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <input
              type="checkbox"
              checked={saveAs}
              onChange={(e) => setSaveAs(e.target.checked)}
              className="h-4 w-4 accent-fuchsia-400"
            />
            <span className="text-sm text-white/70">下载时询问保存位置</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3 font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "处理中…" : "下载 VSIX"}
        </button>

        {status !== "idle" && (
          <p
            className={`mt-4 text-sm ${
              status === "error"
                ? "text-rose-300"
                : status === "done"
                  ? "text-emerald-300"
                  : "text-white/60"
            }`}
          >
            {message}
          </p>
        )}
      </form>

      <p className="mt-4 px-2 text-xs leading-relaxed text-white/40">
        提示：版本号留空时会调用 Visual Studio Marketplace API 自动获取最新版本。
        如果查询失败，可手动填入版本号后再下载。
      </p>
    </div>
  );
}
