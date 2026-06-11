import { useMemo, useState } from "react";
import { MacWallpaperBg } from "./components/MacWallpaperBg";
import { tools } from "./tools/registry";

export function App() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeTool = useMemo(
    () => tools.find((t) => t.id === activeId) ?? null,
    [activeId],
  );

  const now = new Date();
  const greeting =
    now.getHours() < 6
      ? "夜深了"
      : now.getHours() < 12
        ? "早上好"
        : now.getHours() < 18
          ? "下午好"
          : "晚上好";

  return (
    <div className="aurora-bg relative min-h-full w-full overflow-hidden text-white">
      <MacWallpaperBg />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10">
        <header className="mb-10">
          {activeTool ? (
            <button
              onClick={() => setActiveId(null)}
              className="glass glass-hover inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white/80"
            >
              <span aria-hidden>←</span> 返回工具面板
            </button>
          ) : (
            <>
              <p className="text-sm font-medium text-white/50">{greeting} 👋</p>
              <h1 className="mt-1 text-4xl font-bold tracking-tight">
                开发者工具面板
              </h1>
              <p className="mt-2 text-white/50">
                一站式开发小工具集合 · 选择一个工具开始
              </p>
            </>
          )}
        </header>

        <main className="flex-1">
          {activeTool ? (
            <section>
              <div className="mb-6 flex items-center gap-3">
                <span className="text-3xl">{activeTool.icon}</span>
                <div>
                  <h2 className="text-2xl font-semibold">{activeTool.name}</h2>
                  <p className="text-sm text-white/50">
                    {activeTool.description}
                  </p>
                </div>
              </div>
              {activeTool.component ? <activeTool.component /> : null}
            </section>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  disabled={!tool.available}
                  onClick={() => tool.available && setActiveId(tool.id)}
                  className={`glass ${
                    tool.available
                      ? "glass-hover cursor-pointer"
                      : "cursor-default opacity-50"
                  } group relative overflow-hidden rounded-3xl p-6 text-left`}
                >
                  <div
                    className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${tool.accent} blur-2xl`}
                  />
                  <div className="relative">
                    <div className="text-3xl">{tool.icon}</div>
                    <h3 className="mt-4 text-lg font-semibold">{tool.name}</h3>
                    <p className="mt-1 text-sm text-white/50">
                      {tool.description}
                    </p>
                    {!tool.available && (
                      <span className="mt-3 inline-block rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/40">
                        即将推出
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>

        <footer className="mt-10 text-center text-xs text-white/30">
          Copyright © 2026 - All right reserved by Kylan
        </footer>
      </div>
    </div>
  );
}
