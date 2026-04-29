import { useEffect, useState } from "react";
import { extractHtml } from "@/lib/fox-stream";
import { Button } from "@/components/ui/button";
import { Code2, Eye, Download, ExternalLink, Copy, Smartphone, Tablet, Monitor, Package } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

interface Props { content: string; }

// Extract CSS + JS as standalone files BUT keep the original index.html fully self-contained
// so users can open index.html directly and it works without any other file.
function extractAssets(html: string): { css: string; js: string } {
  let css = "";
  let js = "";
  const styleMatches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  css = styleMatches.map(m => m[1].trim()).filter(Boolean).join("\n\n/* --- */\n\n");
  const scriptMatches = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  js = scriptMatches.map(m => m[1].trim()).filter(Boolean).join("\n\n// ---\n\n");
  return { css, js };
}

export function BuilderPreview({ content }: Props) {
  const html = extractHtml(content);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [html]);

  if (!html) return null;

  const downloadHtml = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "index.html"; a.click();
    URL.revokeObjectURL(url);
    toast.success("index.html downloaded");
  };

  const downloadZip = async () => {
    try {
      const { css, js } = extractAssets(html);
      const zip = new JSZip();
      // index.html stays fully self-contained (works standalone — single click run)
      zip.file("index.html", html);
      // ALSO ship extracted copies for editing convenience
      if (css) zip.file("style.css", css);
      if (js) zip.file("script.js", js);
      zip.file(
        "README.md",
        `# FOX AI Project\n\nBuilt with **FOX AI Ultra** 🦊\n\n## Run\nJust open \`index.html\` in any browser — works offline, no build step.\n\n## Files\n- \`index.html\` — main entry (fully self-contained)\n${css ? "- `style.css` — extracted styles (editable copy)\n" : ""}${js ? "- `script.js` — extracted scripts (editable copy)\n" : ""}\n## Edit\nOpen \`index.html\` in VS Code and edit the inline \`<style>\` / \`<script>\`, or refactor to use the external files.\n`
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `fox-project-${Date.now()}.zip`; a.click();
      URL.revokeObjectURL(url);
      toast.success("ZIP ready — index.html chalega standalone 🔥");
    } catch (e) {
      toast.error("ZIP build failed");
    }
  };

  const open = () => { if (src) window.open(src, "_blank"); };
  const copy = () => { navigator.clipboard.writeText(html); toast.success("HTML copied"); };

  const widths = { mobile: 360, tablet: 720, desktop: "100%" } as const;
  const heights = { mobile: 380, tablet: 460, desktop: 520 } as const;

  return (
    <div className="mt-3 rounded-xl border border-border overflow-hidden bg-secondary/30 glow">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-secondary border-b border-border">
        <div className="flex gap-1">
          <Button size="sm" variant={view === "preview" ? "default" : "ghost"} onClick={() => setView("preview")} className="h-8"><Eye className="w-3.5 h-3.5 mr-1" />Preview</Button>
          <Button size="sm" variant={view === "code" ? "default" : "ghost"} onClick={() => setView("code")} className="h-8"><Code2 className="w-3.5 h-3.5 mr-1" />Code</Button>
        </div>
        {view === "preview" && (
          <div className="flex gap-1">
            <Button size="sm" variant={device === "mobile" ? "default" : "ghost"} onClick={() => setDevice("mobile")} className="h-8 w-8 p-0"><Smartphone className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant={device === "tablet" ? "default" : "ghost"} onClick={() => setDevice("tablet")} className="h-8 w-8 p-0"><Tablet className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant={device === "desktop" ? "default" : "ghost"} onClick={() => setDevice("desktop")} className="h-8 w-8 p-0"><Monitor className="w-3.5 h-3.5" /></Button>
          </div>
        )}
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant="ghost" onClick={copy} className="h-8" title="Copy HTML"><Copy className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={open} className="h-8" title="Open in new tab"><ExternalLink className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={downloadHtml} className="h-8" title="Download index.html"><Download className="w-3.5 h-3.5 mr-1" />HTML</Button>
          <Button size="sm" variant="default" onClick={downloadZip} className="h-8 gradient-bg" title="Download full project ZIP"><Package className="w-3.5 h-3.5 mr-1" />ZIP</Button>
        </div>
      </div>
      {view === "preview" ? (
        <div className="bg-background flex justify-center p-2" style={{ height: heights[device] + 16 }}>
          <iframe
            title="preview"
            src={src}
            sandbox="allow-scripts allow-same-origin allow-forms"
            className="border border-border rounded-md bg-white"
            style={{ width: widths[device], height: heights[device], maxWidth: "100%" }}
          />
        </div>
      ) : (
        <pre className="p-3 max-h-[420px] overflow-auto text-xs font-mono bg-background scroll-thin"><code>{html}</code></pre>
      )}
    </div>
  );
}
