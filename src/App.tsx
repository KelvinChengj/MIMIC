import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  Droplets,
  ExternalLink,
  Factory,
  FlaskConical,
  Gauge,
  LayoutGrid,
  Maximize2,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Wind,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  aggregate,
  communityPages,
  seedTags,
  sites,
  statuses,
  systems,
  tagStatus,
  validRules,
} from "./data";
import type { Status, Tag } from "./data";
import { fetchFdmValues } from "./fdm";
import type { Sample } from "./fdm";
const liveFdm = import.meta.env.VITE_FDM_MODE === "live";
const icons: LucideIcon[] = [
  Droplets,
  Wind,
  FlaskConical,
  Zap,
  Wind,
  Activity,
  Droplets,
];
type Saved = { tags: Tag[]; timeout: number; title: string };
function readStored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function Signal({
  status,
  small = false,
}: {
  status: Status;
  small?: boolean;
}) {
  return (
    <span
      className={`signal ${status} ${small ? "small" : ""}`}
      aria-label={statuses[status].label}
    >
      {status === "green" ? (
        <Check />
      ) : status === "red" ? (
        <X />
      ) : status === "yellow" ? (
        <span>!</span>
      ) : (
        <span>—</span>
      )}
    </span>
  );
}
function Dot({ status }: { status: Status }) {
  return <span className={`dot ${status}`} />;
}
function Logo() {
  return (
    <div className="brand">
      <svg width="32" height="34" viewBox="0 0 32 34" aria-hidden="true">
        <path
          fill="#215b5b"
          d="M1 8 9 3 16 12 23 3 31 8 31 28 23 32 23 15 16 24 9 15 9 32 1 28Z"
        />
        <path fill="#89b7ad" d="m9 3 7 9 7-9v12l-7 9-7-9Z" />
      </svg>
      <div>
        <strong>
          MIMIC<span>®</span>
        </strong>
        <small>FACILITIES INTELLIGENCE</small>
      </div>
    </div>
  );
}
export default function App() {
  const [path, setPath] = useState(
    location.pathname === "/" ? "/overview" : location.pathname,
  );
  const [collapsed, setCollapsed] = useState(false);
  const [favOpen, setFavOpen] = useState(true);
  const [favorites, setFavorites] = useState<string[]>(() =>
    readStored("mimic.favorites", ["upw-duty", "upw-reclaim"]),
  );
  const [saved, setSaved] = useState<Record<string, Saved>>(() =>
    readStored("mimic.rules", {}),
  );
  const [samples, setSamples] = useState<Record<string, Sample>>({});
  const [fdmError, setFdmError] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [addTag, setAddTag] = useState(false);
  const [newId, setNewId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [notice, setNotice] = useState("");
  const [help, setHelp] = useState(false);
  const [time, setTime] = useState(new Date());
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [exploreSystem, setExploreSystem] = useState("all");
  const [exploreSite, setExploreSite] = useState("all");
  const [sort, setSort] = useState("favorites");
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [draft, setDraft] = useState<Tag[]>([]);
  const [draftTimeout, setDraftTimeout] = useState(15);
  const [draftTitle, setDraftTitle] = useState("");
  const [testResult, setTestResult] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const isExplore = path === "/explore",
    isEdit = path.startsWith("/edit/");
  const page = path.startsWith("/p/")
    ? communityPages.find((p) => p.id === path.split("/")[2])
    : undefined;
  const parts = path.split("/");
  const selectedSite = page?.site ?? (parts[2]?.toUpperCase() || "F18P2");
  const selectedSystem = page?.system ?? (parts[3] || "upw");
  const system = systems.find((s) => s.id === selectedSystem);
  const isDetail =
    !!system &&
    sites.includes(selectedSite) &&
    (path.startsWith("/systems/") || isEdit || !!page);
  const key = `${selectedSite}/${selectedSystem}`;
  function currentSample(id: string): Sample {
    const sample = samples[id];
    return sample
      ? {
          ...sample,
          ageMinutes:
            sample.ageMinutes + Math.max(0, (clock - receivedAt) / 60000),
        }
      : { value: null, ageMinutes: Infinity };
  }
  function getTags(site: string, systemId: string): Tag[] {
    return (saved[`${site}/${systemId}`]?.tags ?? seedTags(site, systemId)).map(
      (t) => ({
        ...t,
        ...(liveFdm ? currentSample(t.id) : {}),
      }),
    );
  }
  const tags = useMemo(
    () =>
      getTags(
        sites.includes(selectedSite) ? selectedSite : "F18P2",
        system ? selectedSystem : "upw",
      ),
    [
      key,
      saved,
      samples,
      clock,
      receivedAt,
      selectedSite,
      selectedSystem,
      system,
    ],
  );
  const timeout = saved[key]?.timeout ?? 15;
  const currentStatus = aggregate(tags, timeout);
  const title =
    page?.title ??
    saved[key]?.title ??
    `${selectedSite} 廠區 · ${system?.name ?? "超純水"} ${system?.en ?? "UPW"}`;
  useEffect(() => {
    const pop = () => setPath(location.pathname);
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    localStorage.setItem("mimic.favorites", JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    localStorage.setItem("mimic.rules", JSON.stringify(saved));
  }, [saved]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (isEdit) {
      setDraft(tags.map((t) => ({ ...t })));
      setDraftTimeout(timeout);
      setDraftTitle(title);
      setTestResult(null);
      setError("");
    }
  }, [path]);
  useEffect(() => {
    if (!liveFdm) return;
    const timer = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (liveFdm && isEdit) {
      setDraft((old) => old.map((t) => ({ ...t, ...currentSample(t.id) })));
      setTestResult(null);
    }
  }, [samples, clock, path]);
  function navigate(next: string) {
    history.pushState({}, "", next);
    setPath(next);
    setTagSearch("");
    setOnlyAbnormal(false);
    window.scrollTo(0, 0);
  }
  function toggleFavorite(id: string) {
    setFavorites((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
    );
    setNotice(
      favorites.includes(id)
        ? "已從 Favorites 移除"
        : "已加入 Favorites，燈號將與原頁面同步",
    );
  }
  function cellStatus(si: number, sy: number): Status {
    const cellKey = `${sites[si]}/${systems[sy].id}`;
    return aggregate(
      getTags(sites[si], systems[sy].id),
      saved[cellKey]?.timeout ?? 15,
    );
  }
  const allStates = sites.flatMap((_, i) =>
    systems.map((_, j) => cellStatus(i, j)),
  );
  const count = (s: Status) => allStates.filter((x) => x === s).length;
  const rows = sites.filter((s) => siteFilter === "all" || s === siteFilter);
  const filteredPages = communityPages
    .filter(
      (p) =>
        (exploreSystem === "all" || p.system === exploreSystem) &&
        (exploreSite === "all" || p.site === exploreSite) &&
        `${p.title} ${p.description} ${p.author}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "favorites"
        ? b.favorites - a.favorites
        : b.updated.localeCompare(a.updated),
    );
  const shownTags = tags.filter(
    (t) =>
      (!onlyAbnormal || ["red", "yellow"].includes(tagStatus(t, timeout))) &&
      `${t.id} ${t.description}`
        .toLowerCase()
        .includes(tagSearch.toLowerCase()),
  );
  function updateTag(index: number, change: Partial<Tag>) {
    setDraft((old) =>
      old.map((t, i) => (i === index ? { ...t, ...change } : t)),
    );
    setTestResult(null);
    setError("");
  }
  function validate() {
    if (!validRules(draft)) {
      setError(
        "請檢查門檻：高於模式的紅門檻須大於黃門檻；低於模式則須小於黃門檻。",
      );
      return false;
    }
    if (
      !draftTitle.trim() ||
      draftTimeout < 1 ||
      !Number.isFinite(draftTimeout)
    ) {
      setError("請輸入頁面名稱，並設定至少 1 分鐘的無資料逾時。");
      return false;
    }
    return true;
  }
  function save() {
    if (!validate()) return;
    setSaved((old) => ({
      ...old,
      [key]: { tags: draft, timeout: draftTimeout, title: draftTitle.trim() },
    }));
    navigate(`/systems/${selectedSite.toLowerCase()}/${selectedSystem}`);
    setNotice("燈號設定已儲存，燈號牆已同步更新");
  }
  async function refresh() {
    if (!liveFdm) {
      setTime(new Date());
      setNotice("示範 FDM 快照已重新載入；尚未連接正式 API");
      return;
    }
    setLoading(true);
    try {
      const all = sites.flatMap((site) =>
        systems.flatMap((s) => getTags(site, s.id)),
      );
      setSamples(await fetchFdmValues(all));
      setReceivedAt(Date.now());
      setClock(Date.now());
      setFdmError(false);
      setTime(new Date());
      setNotice("FDM 數值已更新");
    } catch (e) {
      setSamples({});
      setFdmError(true);
      setNotice(e instanceof Error ? e.message : "FDM 更新失敗");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (liveFdm) void refresh();
  }, []);
  function appendTag() {
    if (!newId.trim() || !newDescription.trim()) {
      setError("請輸入 Tag name 與 Description");
      return;
    }
    if (draft.some((t) => t.id === newId.trim())) {
      setError("此 Tag 已在監控清單");
      return;
    }
    setDraft((old) => [
      ...old,
      {
        id: newId.trim(),
        description: newDescription.trim(),
        unit: newUnit.trim(),
        value: samples[newId.trim()]?.value ?? null,
        ageMinutes: samples[newId.trim()]?.ageMinutes ?? Infinity,
        direction: "above",
        yellow: 1,
        red: 3,
        enabled: true,
      },
    ]);
    setAddTag(false);
    setNewId("");
    setNewDescription("");
    setNewUnit("");
    setTestResult(null);
    setError("");
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(location.href);
      setNotice("頁面連結已複製");
    } catch {
      setNotice(`頁面網址：${location.href}`);
    }
  }
  return (
    <div className={`app ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button collapse"
            aria-label="收合側欄"
            onClick={() => setCollapsed(!collapsed)}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        <div className="sidebar-content">
          <div className="workspace-label">
            WORKSPACE <span>F18 廠務</span>
          </div>
          <button
            className={`nav-item ${!isExplore && !isDetail ? "active" : ""}`}
            onClick={() => navigate("/overview")}
          >
            <LayoutGrid size={18} />
            <span>廠務總覽</span>
            <span className="nav-count">28</span>
          </button>
          <button
            className={`nav-item ${isExplore ? "active" : ""}`}
            onClick={() => navigate("/explore")}
          >
            <Search size={18} />
            <span>Explore MIMIC</span>
            <ArrowRight size={15} />
          </button>
          <div className="nav-section">
            <button onClick={() => setFavOpen(!favOpen)}>
              <ChevronDown size={14} className={!favOpen ? "rotated" : ""} />
              <span>Favorites</span>
              <span className="section-count">{favorites.length}</span>
            </button>
            <button
              className="icon-button"
              aria-label="尋找頁面並新增收藏"
              onClick={() => navigate("/explore")}
            >
              <Plus size={16} />
            </button>
          </div>
          {favOpen && (
            <div className="favorite-list">
              <div className="group-heading">
                <span>廠務監控</span>
                <MoreHorizontal size={16} />
              </div>
              <button
                className={`favorite-item ${path === "/overview" ? "selected" : ""}`}
                onClick={() => navigate("/overview")}
              >
                <LayoutGrid size={15} />
                <span>F18A 全廠總覽</span>
                <Dot status={allStates.includes("red") ? "red" : "green"} />
              </button>
              {favorites.map((id) => {
                const p = communityPages.find((x) => x.id === id);
                return (
                  p && (
                    <button
                      key={id}
                      className={`favorite-item ${path === `/p/${id}` ? "selected" : ""}`}
                      onClick={() => navigate(`/p/${id}`)}
                    >
                      <Star size={15} />
                      <span>{p.title}</span>
                      <Dot
                        status={aggregate(
                          getTags(p.site, p.system),
                          saved[`${p.site}/${p.system}`]?.timeout ?? 15,
                        )}
                      />
                    </button>
                  )
                );
              })}
              <div className="group-heading second">系統捷徑</div>
              {systems.slice(0, 5).map((s, i) => {
                const Icon = icons[i];
                return (
                  <button
                    key={s.id}
                    className={`favorite-item ${isDetail && selectedSystem === s.id && !page ? "selected" : ""}`}
                    onClick={() => navigate(`/systems/f18p2/${s.id}`)}
                  >
                    <Icon size={15} />
                    <span>
                      {s.name} {s.en}
                    </span>
                    <Dot status={cellStatus(1, i)} />
                  </button>
                );
              })}
            </div>
          )}
          <div className="sidebar-tip">
            <div className="tip-icon">
              <ShieldCheck size={20} />
            </div>
            <strong>讓每個異常，都被看見。</strong>
            <p>連結廠務資料，掌握系統狀態。</p>
            <button onClick={() => setHelp(true)}>
              認識 MIMIC <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">KC</span>
          <div>
            <strong>Kelvin Cheng</strong>
            <small>廠務工程師</small>
          </div>
          <button
            className="icon-button"
            aria-label="使用說明"
            onClick={() => setHelp(true)}
          >
            <Settings2 size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            {collapsed && (
              <button
                className="icon-button"
                aria-label="展開側欄"
                onClick={() => setCollapsed(false)}
              >
                <Menu size={20} />
              </button>
            )}
            <Factory size={16} />
            <span>廠務監控</span>
            <ChevronRight size={13} />
            <strong>
              {isExplore
                ? "Explore"
                : isEdit
                  ? "編輯燈號"
                  : isDetail
                    ? system?.name
                    : "全廠總覽"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="connection">
              <i />
              {liveFdm
                ? fdmError
                  ? "FDM 連線失敗"
                  : loading
                    ? "FDM 更新中"
                    : "FDM 正式資料"
                : "FDM 示範資料"}
            </span>
            <span className="top-divider" />
            <span className="updated">
              更新 {time.toLocaleTimeString("en-GB", { hour12: false })}
            </span>
            <button
              className="icon-button"
              aria-label="查看資料來源說明"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={18} />
            </button>
            <button
              className="icon-button notification"
              aria-label="查看異常"
              onClick={() => {
                navigate("/overview");
                setStatusFilter("red");
              }}
            >
              <Bell size={18} />
              <i />
            </button>
          </div>
        </header>
        <main>
          {isExplore ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">DISCOVER & CONNECT</div>
                  <h1>
                    Explore MIMIC<span className="heading-dot">.</span>
                  </h1>
                  <p>探索團隊的監控頁面，將關注的系統加入你的 Favorites。</p>
                </div>
                <span className="page-id">
                  <Search size={15} />
                  團隊共享空間
                </span>
              </div>
              <form
                className="explore-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  setQuery(search);
                }}
              >
                <Search size={21} />
                <input
                  aria-label="搜尋頁面"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜尋頁面名稱、系統或作者，例如 UPW…"
                />
                {search && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="清除搜尋"
                    onClick={() => {
                      setSearch("");
                      setQuery("");
                    }}
                  >
                    <X size={17} />
                  </button>
                )}
                <button className="button primary" type="submit">
                  搜尋頁面 <ArrowRight size={16} />
                </button>
              </form>
              <div className="explore-toolbar">
                <div className="filter-controls">
                  <SlidersHorizontal size={17} />
                  <select
                    aria-label="系統篩選"
                    value={exploreSystem}
                    onChange={(e) => setExploreSystem(e.target.value)}
                  >
                    <option value="all">所有系統</option>
                    {systems.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="廠區篩選"
                    value={exploreSite}
                    onChange={(e) => setExploreSite(e.target.value)}
                  >
                    <option value="all">所有廠區</option>
                    {sites.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <label className="sort-label">
                  排序{" "}
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="favorites">最多收藏</option>
                    <option value="updated">最近更新</option>
                  </select>
                </label>
              </div>
              <div className="panel community-panel">
                <div className="panel-heading">
                  <h2>
                    {query ? `「${query}」的搜尋結果` : "團隊監控頁面"}{" "}
                    <span className="subtle-count">{filteredPages.length}</span>
                  </h2>
                  <span>收藏頁面與原頁面燈號保持同步</span>
                </div>
                <table className="explore-table">
                  <thead>
                    <tr>
                      <th>MIMIC PAGE</th>
                      <th>建立者</th>
                      <th>系統 / 廠區</th>
                      <th>收藏數</th>
                      <th>更新時間</th>
                      <th>收藏</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPages.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <button
                            className="page-link"
                            onClick={() => navigate(`/p/${p.id}`)}
                          >
                            <Dot
                              status={
                                saved[`${p.site}/${p.system}`]
                                  ? aggregate(
                                      saved[`${p.site}/${p.system}`].tags,
                                      saved[`${p.site}/${p.system}`].timeout,
                                    )
                                  : p.status
                              }
                            />
                            <div>
                              <strong>{p.title}</strong>
                              <small>{p.description}</small>
                            </div>
                            <ExternalLink size={14} />
                          </button>
                        </td>
                        <td>
                          <div className="author">
                            <span className="avatar light">{p.initials}</span>
                            <div>
                              {p.author}
                              <small>{p.team}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="system-pill">
                            {systems.find((s) => s.id === p.system)?.name}
                          </span>
                          <small className="site-small">{p.site}</small>
                        </td>
                        <td className="number">
                          {p.favorites + (favorites.includes(p.id) ? 1 : 0)}
                        </td>
                        <td className="muted">{p.updated}</td>
                        <td>
                          <button
                            className={`star-button ${favorites.includes(p.id) ? "favorited" : ""}`}
                            aria-label={`${favorites.includes(p.id) ? "取消收藏" : "收藏"} ${p.title}`}
                            aria-pressed={favorites.includes(p.id)}
                            onClick={() => toggleFavorite(p.id)}
                          >
                            <Star size={21} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredPages.length && (
                  <div className="empty-state">
                    <Search size={28} />
                    <strong>找不到符合的頁面</strong>
                    <p>試試其他關鍵字，或調整系統與廠區篩選。</p>
                    <button
                      className="button"
                      onClick={() => {
                        setSearch("");
                        setQuery("");
                        setExploreSystem("all");
                        setExploreSite("all");
                      }}
                    >
                      清除篩選
                    </button>
                  </div>
                )}
              </div>
              <div className="explore-note">
                <Star size={15} />
                點選星號即可加入 Favorites，從側欄快速存取你的日常監控。
              </div>
            </>
          ) : isEdit ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">CONFIGURE YOUR SIGNALS</div>
                  <h1>
                    編輯燈號 <span className="editing-badge">編輯模式</span>
                  </h1>
                  <p>用 Tag 定義監控規則，讓每一盞燈反映真實狀態。</p>
                </div>
                <div className="heading-actions">
                  <button
                    className="button"
                    onClick={() =>
                      navigate(
                        `/systems/${selectedSite.toLowerCase()}/${selectedSystem}`,
                      )
                    }
                  >
                    取消
                  </button>
                  <button className="button primary" onClick={save}>
                    <Check size={16} />
                    儲存變更
                  </button>
                </div>
              </div>
              <div className="edit-context">
                <Factory size={17} />
                <span>{selectedSite} 廠區</span>
                <ChevronRight size={14} />
                <span>
                  {system?.name} {system?.en}
                </span>
                <span className="context-right">
                  資料來源 <strong>FDM</strong>
                </span>
              </div>
              <div className="editor-layout">
                <div>
                  <section className="panel settings-panel">
                    <div className="panel-heading">
                      <h2>
                        <span className="step-number">01</span>基本設定
                      </h2>
                    </div>
                    <div className="basic-fields">
                      <label>
                        燈號頁面名稱
                        <input
                          value={draftTitle}
                          onChange={(e) => {
                            setDraftTitle(e.target.value);
                            setTestResult(null);
                          }}
                        />
                      </label>
                      <label>
                        無資料逾時
                        <div className="input-unit">
                          <input
                            type="number"
                            min="1"
                            value={draftTimeout}
                            onChange={(e) => {
                              setDraftTimeout(Number(e.target.value));
                              setTestResult(null);
                            }}
                          />
                          <span>分鐘</span>
                        </div>
                      </label>
                    </div>
                  </section>
                  <section className="panel rules-panel">
                    <div className="panel-heading">
                      <h2>
                        <span className="step-number">02</span>Tag 燈號規則{" "}
                        <span className="subtle-count">
                          {draft.filter((t) => t.enabled).length} /{" "}
                          {draft.length}
                        </span>
                      </h2>
                      <span>依 FDM 目前數值設定門檻</span>
                    </div>
                    <div className="rules-intro">
                      <SlidersHorizontal size={16} />
                      選擇判定方向，設定黃色與紅色管制門檻。
                      <button
                        className="text-button add-tag-button"
                        onClick={() => {
                          setError("");
                          setAddTag(true);
                        }}
                      >
                        <Plus size={14} />
                        新增 Tag
                      </button>
                    </div>
                    <div className="table-scroll">
                      <table className="rules-table">
                        <thead>
                          <tr>
                            <th>監控</th>
                            <th>TAG NAME / DESCRIPTION</th>
                            <th>目前值</th>
                            <th>判定方向</th>
                            <th>
                              <Dot status="yellow" />
                              黃門檻
                            </th>
                            <th>
                              <Dot status="red" />
                              紅門檻
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {draft.map((t, i) => (
                            <tr
                              key={t.id}
                              className={!t.enabled ? "disabled-row" : ""}
                            >
                              <td>
                                <input
                                  aria-label={`監控 ${t.id}`}
                                  type="checkbox"
                                  checked={t.enabled}
                                  onChange={(e) =>
                                    updateTag(i, { enabled: e.target.checked })
                                  }
                                />
                              </td>
                              <td>
                                <strong className="tag-id">{t.id}</strong>
                                <small>
                                  {t.description} · {t.unit}
                                </small>
                              </td>
                              <td>
                                <span
                                  className={`value ${tagStatus(t, draftTimeout)}`}
                                >
                                  {t.value ?? "—"}
                                </span>
                              </td>
                              <td>
                                <select
                                  aria-label={`${t.id} 判定方向`}
                                  value={t.direction}
                                  onChange={(e) =>
                                    updateTag(i, {
                                      direction: e.target
                                        .value as Tag["direction"],
                                    })
                                  }
                                >
                                  <option value="above">高於 &gt;</option>
                                  <option value="below">低於 &lt;</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  aria-label={`${t.id} 黃門檻`}
                                  type="number"
                                  step="any"
                                  value={Number.isNaN(t.yellow) ? "" : t.yellow}
                                  onChange={(e) =>
                                    updateTag(i, {
                                      yellow:
                                        e.target.value === ""
                                          ? NaN
                                          : Number(e.target.value),
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  aria-label={`${t.id} 紅門檻`}
                                  type="number"
                                  step="any"
                                  value={Number.isNaN(t.red) ? "" : t.red}
                                  onChange={(e) =>
                                    updateTag(i, {
                                      red:
                                        e.target.value === ""
                                          ? NaN
                                          : Number(e.target.value),
                                    })
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="rules-footer">
                      <ShieldCheck size={15} />
                      紅燈優先於黃燈，未勾選的 Tag 不參與判定。
                    </div>
                  </section>
                </div>
                <aside className="test-column">
                  <section className="panel test-panel">
                    <div className="panel-heading">
                      <h2>
                        <Play size={17} />
                        燈號試算
                      </h2>
                      <span className="live-label">PREVIEW</span>
                    </div>
                    <p>使用目前 FDM 快照，驗證你的門檻設定。</p>
                    <div
                      className={`preview-signal ${testResult ?? "untested"}`}
                    >
                      <Signal status={testResult ?? "gray"} />
                      <strong>
                        {testResult ? statuses[testResult].label : "等待試算"}
                      </strong>
                      <span>
                        {testResult
                          ? `${draft.filter((t) => t.enabled).length} 個 Tag 參與判定`
                          : "調整規則後，按 Test 查看結果"}
                      </span>
                    </div>
                    <button
                      className="button primary test-button"
                      onClick={() => {
                        if (validate()) {
                          setTestResult(aggregate(draft, draftTimeout));
                          setError("");
                        }
                      }}
                    >
                      <Play size={16} />
                      Test 試算
                    </button>
                    {testResult && (
                      <div className="test-breakdown">
                        {(["red", "yellow", "green", "gray"] as Status[]).map(
                          (s) => (
                            <div key={s}>
                              <span>
                                <Dot status={s} />
                                {statuses[s].label}
                              </span>
                              <strong>
                                {
                                  draft.filter(
                                    (t) =>
                                      t.enabled &&
                                      tagStatus(t, draftTimeout) === s,
                                  ).length
                                }
                                <small> Tags</small>
                              </strong>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                    {error && (
                      <div className="form-error" role="alert">
                        {error}
                      </div>
                    )}
                    <div className="preview-note">
                      試算不會儲存變更。確認結果後，按「儲存變更」套用設定。
                    </div>
                  </section>
                  <section className="rule-guide">
                    <div>
                      <CircleHelp size={17} />
                      <strong>燈號如何判定？</strong>
                    </div>
                    <p>
                      <Dot status="red" />
                      <span>任一 Tag 超出紅色門檻</span>
                    </p>
                    <p>
                      <Dot status="yellow" />
                      <span>無紅燈，任一 Tag 超出黃色門檻</span>
                    </p>
                    <p>
                      <Dot status="green" />
                      <span>所有監控 Tag 均在正常範圍</span>
                    </p>
                    <p>
                      <Dot status="gray" />
                      <span>有缺值、逾時或無監控 Tag</span>
                    </p>
                  </section>
                </aside>
              </div>
            </>
          ) : isDetail ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <button
                      className="text-button"
                      onClick={() => navigate("/overview")}
                    >
                      F18A 全廠總覽
                    </button>
                    <ChevronRight size={12} />
                    {selectedSite} 廠區
                  </div>
                  <h1>{title}</h1>
                  <p>設備參數、即時數值與燈號規則，一目了然。</p>
                </div>
                <div className="heading-actions">
                  <button
                    className="button icon-only"
                    aria-label="複製頁面網址"
                    onClick={copy}
                  >
                    <Copy size={17} />
                  </button>
                  <button
                    className="button primary"
                    onClick={() =>
                      navigate(
                        `/edit/${selectedSite.toLowerCase()}/${selectedSystem}`,
                      )
                    }
                  >
                    <Pencil size={16} />
                    編輯燈號
                  </button>
                </div>
              </div>
              <section className={`detail-status panel ${currentStatus}`}>
                <Signal status={currentStatus} />
                <div>
                  <div className="status-title">
                    <h2>{statuses[currentStatus].label}</h2>
                    <span className={`status-badge ${currentStatus}`}>
                      {
                        tags.filter(
                          (t) =>
                            t.enabled &&
                            tagStatus(t, timeout) === currentStatus,
                        ).length
                      }{" "}
                      個 {statuses[currentStatus].label} Tag
                    </span>
                  </div>
                  <p>
                    {currentStatus === "red"
                      ? "監控 Tag 超出紅色管制門檻，請優先確認相關設備。"
                      : currentStatus === "yellow"
                        ? "部分監控 Tag 超出黃色管制門檻，建議確認參數。"
                        : currentStatus === "gray"
                          ? "監控 Tag 缺值或逾時，請確認 FDM 資料連線。"
                          : "所有監控 Tag 均在正常管制範圍內。"}
                  </p>
                  <small>
                    <span className="mono">{path}</span>
                    <span>資料逾時：{timeout} 分鐘</span>
                  </small>
                </div>
                <button className="button" onClick={refresh} disabled={loading}>
                  <RefreshCw size={16} />
                  更新數值
                </button>
              </section>
              <section className="panel tag-panel">
                <div className="panel-heading">
                  <h2>
                    Tag 燈號清單{" "}
                    <span className="subtle-count">{shownTags.length}</span>
                  </h2>
                  <div className="tag-controls">
                    <div className="mini-search">
                      <Search size={15} />
                      <input
                        aria-label="搜尋 Tag"
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        placeholder="搜尋 Tag…"
                      />
                    </div>
                    <div className="segmented">
                      <button
                        className={!onlyAbnormal ? "selected" : ""}
                        onClick={() => setOnlyAbnormal(false)}
                      >
                        全部 Tag
                      </button>
                      <button
                        className={onlyAbnormal ? "selected" : ""}
                        onClick={() => setOnlyAbnormal(true)}
                      >
                        僅顯示異常
                      </button>
                    </div>
                  </div>
                </div>
                <table className="tag-table">
                  <thead>
                    <tr>
                      <th>TAG NAME</th>
                      <th>DESCRIPTION</th>
                      <th>VALUE</th>
                      <th>狀態</th>
                      <th>黃 / 紅門檻</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownTags.map((t) => {
                      const st = tagStatus(t, timeout);
                      return (
                        <tr
                          key={t.id}
                          className={st === "red" ? "abnormal-row" : ""}
                        >
                          <td className="tag-id">
                            {t.id}
                            {!t.enabled && (
                              <span className="disabled-label">未監控</span>
                            )}
                          </td>
                          <td>
                            {t.description}
                            <small className="inline-unit">{t.unit}</small>
                          </td>
                          <td>
                            <span className={`value ${st}`}>
                              <Dot status={st} />
                              {t.value ?? "—"}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${st}`}>
                              {statuses[st].label}
                            </span>
                          </td>
                          <td className="mono muted">
                            {t.direction === "above" ? ">" : "<"} {t.yellow} /{" "}
                            {t.red}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!shownTags.length && (
                  <div className="empty-state">沒有符合條件的 Tag</div>
                )}
                <div className="table-footer">
                  <span>資料來源：FDM {liveFdm ? "正式資料" : "示範快照"}</span>
                  <span>
                    共 {tags.length} 個 Tag ·{" "}
                    {tags.filter((t) => t.enabled).length} 個已啟用監控
                  </span>
                </div>
              </section>
              <div className="detail-bottom">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>
                      <ShieldCheck size={18} />
                      管制邏輯
                    </h2>
                    <button
                      className="text-button"
                      onClick={() =>
                        navigate(
                          `/edit/${selectedSite.toLowerCase()}/${selectedSystem}`,
                        )
                      }
                    >
                      編輯規則 <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="logic-line">
                    <Dot status="red" />
                    <strong>異常</strong>
                    <span>任一啟用 Tag 超出紅色管制門檻</span>
                  </div>
                  <div className="logic-line">
                    <Dot status="yellow" />
                    <strong>部分異常</strong>
                    <span>無紅燈，且至少一個 Tag 超出黄色管制門檻</span>
                  </div>
                  <div className="logic-line">
                    <Dot status="gray" />
                    <strong>無資料</strong>
                    <span>無異常且有缺值，或 {timeout} 分鐘內未收到資料</span>
                  </div>
                </section>
                <section className="panel source-panel">
                  <div className="source-icon">
                    <Activity size={23} />
                  </div>
                  <h3>從資料，到決策。</h3>
                  <p>
                    每盞燈號由 Tag 的物理參數產生。
                    <br />
                    收藏與原頁面共用監控規則。
                  </p>
                  <button
                    className="text-button"
                    onClick={() => navigate("/explore")}
                  >
                    探索更多監控頁面 <ArrowRight size={15} />
                  </button>
                </section>
              </div>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">FACILITIES AT A GLANCE</div>
                  <h1>
                    F18A 全廠總覽<span className="heading-dot">.</span>
                  </h1>
                  <p>每一盞燈，都是廠務的脈動。掌握所有廠區與系統狀態。</p>
                </div>
                <div className="heading-actions">
                  <button className="button" onClick={refresh}>
                    <RefreshCw size={16} />
                    更新數值
                  </button>
                  <button
                    className="button primary"
                    onClick={() => navigate("/edit/f18p2/upw")}
                  >
                    <Pencil size={16} />
                    編輯燈號
                  </button>
                </div>
              </div>
              <div className="summary-grid">
                {(
                  [
                    {
                      status: "green",
                      label: "正常運行",
                      caption: "系統維持穩定",
                      icon: ShieldCheck,
                    },
                    {
                      status: "red",
                      label: "異常系統",
                      caption: "需要立即關注",
                      icon: Activity,
                    },
                    {
                      status: "yellow",
                      label: "部分異常",
                      caption: "建議確認參數",
                      icon: Gauge,
                    },
                    {
                      status: "gray",
                      label: "無資料",
                      caption: "等待 FDM 資料",
                      icon: RefreshCw,
                    },
                  ] as {
                    status: Status;
                    label: string;
                    caption: string;
                    icon: LucideIcon;
                  }[]
                ).map(({ status, label, caption, icon: Icon }) => (
                  <button
                    key={status}
                    className={`summary-card ${status} ${statusFilter === status ? "filter-active" : ""}`}
                    onClick={() =>
                      setStatusFilter(statusFilter === status ? "all" : status)
                    }
                  >
                    <div className="summary-label">
                      <Dot status={status} />
                      {label}
                      <Icon size={18} />
                    </div>
                    <div className="summary-number">
                      {count(status)}
                      <span>/ 28 系統</span>
                    </div>
                    <div className="summary-caption">
                      {caption}
                      <ArrowRight size={14} />
                    </div>
                  </button>
                ))}
              </div>
              <section className="panel wall-panel">
                <div className="panel-heading wall-heading">
                  <div>
                    <h2>
                      廠區 × 系統燈號牆{" "}
                      <span className="live-label">MONITOR</span>
                    </h2>
                    <p>點選燈號，下鑽查看設備與 Tag 參數</p>
                  </div>
                  <div className="wall-actions">
                    <select
                      aria-label="選擇廠區"
                      value={siteFilter}
                      onChange={(e) => setSiteFilter(e.target.value)}
                    >
                      <option value="all">所有廠區</option>
                      {sites.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      className="icon-button"
                      aria-label="全螢幕顯示"
                      onClick={() => {
                        if (document.fullscreenElement)
                          void document.exitFullscreen();
                        else
                          void document.documentElement
                            .requestFullscreen()
                            .catch(() => setNotice("此瀏覽器不支援全螢幕"));
                      }}
                    >
                      <Maximize2 size={17} />
                    </button>
                  </div>
                </div>
                {statusFilter !== "all" && (
                  <div className="filter-banner">
                    目前顯示：{statuses[statusFilter as Status].label}
                    <button onClick={() => setStatusFilter("all")}>
                      清除篩選 <X size={13} />
                    </button>
                  </div>
                )}
                <div className="wall-scroll">
                  <div className="lamp-grid">
                    <div className="grid-corner">廠區 / 系統</div>
                    {systems.map((s, i) => {
                      const Icon = icons[i];
                      return (
                        <div className="system-header" key={s.id}>
                          <Icon size={19} />
                          <strong>{s.name}</strong>
                          <span>{s.en}</span>
                        </div>
                      );
                    })}
                    {rows.map((site) => {
                      const si = sites.indexOf(site);
                      return (
                        <div className="lamp-row" key={site}>
                          <div className="site-header">
                            <span className="site-icon">
                              <Factory size={18} />
                            </span>
                            <strong>{site}</strong>
                            <small>
                              廠區 <span>· 7 系統</span>
                            </small>
                          </div>
                          {systems.map((s, sy) => {
                            const st = cellStatus(si, sy);
                            return (
                              <button
                                key={s.id}
                                className={`lamp-cell ${st} ${statusFilter !== "all" && statusFilter !== st ? "dimmed" : ""}`}
                                onClick={() =>
                                  navigate(
                                    `/systems/${site.toLowerCase()}/${s.id}`,
                                  )
                                }
                                aria-label={`${site} ${s.name} ${statuses[st].label}`}
                              >
                                <Signal status={st} />
                                <strong>{statuses[st].label}</strong>
                                <span>
                                  {st === "red"
                                    ? `${getTags(site, s.id).filter((t) => t.enabled && tagStatus(t, saved[`${site}/${s.id}`]?.timeout ?? 15) === "red").length} 個異常 Tag`
                                    : st === "yellow"
                                      ? `${getTags(site, s.id).filter((t) => t.enabled && tagStatus(t, saved[`${site}/${s.id}`]?.timeout ?? 15) === "yellow").length} 個警告 Tag`
                                      : st === "gray"
                                        ? "等待有效資料"
                                        : "設備運行正常"}
                                </span>
                                <ChevronRight
                                  size={13}
                                  className="cell-arrow"
                                />
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="wall-legend">
                  {(["green", "yellow", "red", "gray"] as Status[]).map((s) => (
                    <span key={s}>
                      <Dot status={s} />
                      {statuses[s].label}
                    </span>
                  ))}
                  <span className="legend-note">
                    <Activity size={14} />
                    資料來源 FDM · {liveFdm ? "正式資料" : "示範快照"}
                  </span>
                </div>
              </section>
              <div className="overview-bottom">
                <section className="panel attention-panel">
                  <div className="panel-heading">
                    <h2>
                      <Activity size={17} />
                      優先關注
                    </h2>
                    <button
                      className="text-button"
                      onClick={() =>
                        setStatusFilter(statusFilter === "red" ? "all" : "red")
                      }
                    >
                      查看所有異常 <ArrowRight size={14} />
                    </button>
                  </div>
                  {sites
                    .flatMap((site, si) =>
                      systems
                        .filter((_, sy) => cellStatus(si, sy) === "red")
                        .map((s) => (
                          <button
                            className="attention-row"
                            key={`${site}/${s.id}`}
                            onClick={() =>
                              navigate(`/systems/${site.toLowerCase()}/${s.id}`)
                            }
                          >
                            <span className="attention-icon">
                              <Dot status="red" />
                            </span>
                            <div>
                              <strong>
                                {site} · {s.name} {s.en}
                              </strong>
                              <small>參數超出紅色管制門檻</small>
                            </div>
                            <span className="status-badge red">異常</span>
                            <ChevronRight size={16} />
                          </button>
                        )),
                    )
                    .slice(0, 3)}
                  {!allStates.includes("red") && (
                    <div className="empty-state">目前沒有異常系統</div>
                  )}
                </section>
                <section className="panel insight-panel">
                  <div className="panel-heading">
                    <h2>全廠運行概況</h2>
                    <span className="muted">4 廠區 / 7 系統</span>
                  </div>
                  <div className="health-row">
                    <div>
                      <strong>
                        {Math.round((count("green") / 28) * 100)}
                        <span>%</span>
                      </strong>
                      <p>系統正常率</p>
                    </div>
                    <div className="health-caption">
                      <ShieldCheck size={18} />
                      <span>
                        {count("green")} 個系統
                        <br />
                        <strong>穩定運行中</strong>
                      </span>
                    </div>
                  </div>
                  <div className="distribution">
                    {(["green", "yellow", "red", "gray"] as Status[]).map(
                      (s) => (
                        <span
                          key={s}
                          className={s}
                          style={{ flex: count(s) }}
                          title={`${statuses[s].label} ${count(s)}`}
                        />
                      ),
                    )}
                  </div>
                  <p className="insight-note">
                    持續追蹤每個系統，讓異常處理更即時。
                  </p>
                </section>
              </div>
            </>
          )}
          <footer className="main-footer">
            <span>
              MIMIC <span>廠務燈號平台</span>
            </span>
            <span>
              <i />
              FDM {liveFdm ? "正式模式" : "示範模式"}{" "}
              <span className="footer-separator">/</span>
              {liveFdm ? "透過後端安全代理" : "資料僅供介面展示"}
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button aria-label="關閉通知" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {addTag && (
        <div className="modal-backdrop" onClick={() => setAddTag(false)}>
          <section
            className="help-modal add-tag-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-tag-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              aria-label="關閉新增 Tag"
              onClick={() => setAddTag(false)}
            >
              <X size={20} />
            </button>
            <h2 id="add-tag-title">新增監控 Tag</h2>
            <p>
              填入 FDM 的 Tag name，設定物理參數與管制門檻。新增 Tag
              在收到有效數值前為灰燈。
            </p>
            <label>
              Tag name
              <input
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="例如 UPW-POL-04.TOC"
              />
            </label>
            <label>
              Description
              <input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="例如 拋光 04 出水總有機碳"
              />
            </label>
            <label>
              單位
              <input
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="例如 ppb"
              />
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary" onClick={appendTag}>
              <Plus size={16} />
              加入監控清單
            </button>
          </section>
        </div>
      )}
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              aria-label="關閉說明"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <Logo />
            <h2 id="help-title">你的廠務監控工作空間</h2>
            <p>
              首頁從廠區與系統查看燈號；點選燈號查看 Tag name、Description 與
              Value。在編輯模式設定黃紅門檻，按 Test 試算後儲存。
            </p>
            <p>
              Explore 可搜尋團隊頁面並加入
              Favorites。收藏共用原頁面的燈號設定，每個頁面都有獨立網址。
            </p>
            <div className="help-data">
              <Activity size={18} />
              <div>
                <strong>FDM 資料來源</strong>
                <p>
                  此版本使用示範快照，尚未連接正式 FDM
                  API。門檻與收藏儲存在目前瀏覽器。
                </p>
              </div>
            </div>
            <button className="button primary" onClick={() => setHelp(false)}>
              開始監控 <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
