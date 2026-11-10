/**
 * 把產生的文字檔交給使用者存檔。
 * - 一般網頁：用 Blob 連結下載。
 * - 內嵌在 claude.ai Artifact 檢視器：頁面不能自己下載，要透過檢視器的 downloads 功能（會先請使用者確認）。
 */
interface ClaudeDownloads {
  save: (req: { filename: string; data: string }) => Promise<{ status: string }>;
}
interface ClaudeRuntime {
  use: (name: 'downloads') => Promise<ClaudeDownloads | null>;
}

export type SaveOutcome = 'saved' | 'declined' | 'started';

export async function saveTextFile(filename: string, text: string, type = 'application/json'): Promise<SaveOutcome> {
  const claude = (window as { claude?: ClaudeRuntime }).claude;
  const downloads = claude?.use ? await claude.use('downloads').catch(() => null) : null;
  if (downloads) {
    try {
      await downloads.save({ filename, data: text });
      return 'saved';
    } catch (e) {
      if ((e as { code?: string })?.code === 'declined') return 'declined';
      // 其他情況（這個檢視畫面不能存檔等）：退回一般下載試試
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'started';
}
