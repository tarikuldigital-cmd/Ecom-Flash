"use client";

import { useEffect, useMemo, useState } from "react";

type SectionType = "HERO" | "TEXT" | "FEATURES" | "PRODUCTS" | "TESTIMONIAL" | "CTA";
type Section = { id: string; type: SectionType; title: string; body: string; buttonText: string; buttonUrl: string };
type Page = { id: string; title: string; slug: string; status: string; sections: Section[]; seoTitle?: string | null; seoDescription?: string | null; updatedAt: string };
const sectionTypes: SectionType[] = ["HERO", "TEXT", "FEATURES", "PRODUCTS", "TESTIMONIAL", "CTA"];
const blankSection = (type: SectionType): Section => ({ id: crypto.randomUUID(), type, title: type === "HERO" ? "Your store, beautifully presented" : "Section heading", body: "Write a clear message for your customers.", buttonText: type === "HERO" || type === "CTA" ? "Shop now" : "", buttonUrl: type === "HERO" || type === "CTA" ? "/products" : "" });

export default function LandingPageBuilder({ tenantId, tenantSlug }: { tenantId: string; tenantSlug: string }) {
  const [pages, setPages] = useState<Page[]>([]);
  const [selected, setSelected] = useState<Page | null>(null);
  const [title, setTitle] = useState("New campaign page");
  const [slug, setSlug] = useState("new-campaign");
  const [sections, setSections] = useState<Section[]>([blankSection("HERO"), blankSection("FEATURES"), blankSection("CTA")]);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const canSave = title.trim().length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && sections.length > 0;

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch(`/api/landing-pages?tenantId=${encodeURIComponent(tenantId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load pages.");
      setPages(data.pages || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load pages."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [tenantId]);

  function startNew() {
    setSelected(null); setTitle("New campaign page"); setSlug("new-campaign");
    setSections([blankSection("HERO"), blankSection("FEATURES"), blankSection("CTA")]);
    setSeoTitle(""); setSeoDescription(""); setError(""); setMessage(""); setPreview(false);
  }
  function editPage(page: Page) {
    setSelected(page); setTitle(page.title); setSlug(page.slug);
    setSections(Array.isArray(page.sections) ? page.sections : []);
    setSeoTitle(page.seoTitle || ""); setSeoDescription(page.seoDescription || "");
    setError(""); setMessage(""); setPreview(false);
  }
  function updateSection(id: string, patch: Partial<Section>) {
    setSections(current => current.map(section => section.id === id ? { ...section, ...patch } : section));
  }
  function moveSection(index: number, direction: -1 | 1) {
    setSections(current => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }
  async function save(status: "DRAFT" | "PUBLISHED" = "DRAFT") {
    setSaving(true); setError(""); setMessage("");
    try {
      const payload = { title, slug, sections, seoTitle: seoTitle || null, seoDescription: seoDescription || null, status };
      const response = await fetch(selected ? `/api/landing-pages/${selected.id}?tenantId=${encodeURIComponent(tenantId)}` : `/api/landing-pages?tenantId=${encodeURIComponent(tenantId)}`, {
        method: selected ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save page.");
      setSelected(data.page); setMessage(status === "PUBLISHED" ? `Page published: /store/${tenantSlug}/pages/${data.page.slug}` : "Draft saved successfully.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save page."); }
    finally { setSaving(false); }
  }
  async function removePage() {
    if (!selected || !window.confirm("Delete this landing page permanently?")) return;
    const response = await fetch(`/api/landing-pages/${selected.id}?tenantId=${encodeURIComponent(tenantId)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not delete page."); return; }
    startNew(); await refresh(); setMessage("Page deleted.");
  }

  const ordered = useMemo(() => sections, [sections]);
  return <section className="lp-builder">
    <div className="lp-builder-heading"><div><p className="text-sm font-semibold tracking-wide text-[#52715e]">STORE EXPERIENCE</p><h2 className="mt-1 text-2xl font-semibold">Landing page builder</h2><p className="mt-1 text-sm text-[#65736b]">Create campaign pages with editable sections and responsive preview.</p></div><button className="lp-primary" onClick={startNew}>+ New page</button></div>
    <div className="lp-builder-layout">
      <aside className="lp-page-list"><h3>My pages</h3>{loading ? <p>Loading pages…</p> : pages.length === 0 ? <p>No pages yet. Create your first campaign page.</p> : pages.map(page => <button key={page.id} className={selected?.id === page.id ? "lp-page-item active" : "lp-page-item"} onClick={() => editPage(page)}><strong>{page.title}</strong><span>/{page.slug} · {page.status}</span></button>)}</aside>
      <div className="lp-editor">
        <div className="lp-editor-toolbar"><span>{selected ? "Editing page" : "New page draft"}</span><div><button onClick={() => setPreview(!preview)}>{preview ? "Edit sections" : "Preview"}</button><button disabled={!canSave || saving} onClick={() => void save("DRAFT")}>{saving ? "Saving…" : "Save draft"}</button><button className="lp-publish" disabled={!canSave || saving} onClick={() => void save("PUBLISHED")}>Publish</button></div></div>
        {error && <p className="lp-error">{error}</p>}{message && <p className="lp-success">{message}</p>}
        {!preview ? <>
          <div className="lp-fields"><label>Page title<input value={title} onChange={e => setTitle(e.target.value)} /></label><label>URL slug<input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} /></label></div>
          <div className="lp-sections-head"><h3>Page sections <span>{sections.length}</span></h3><select aria-label="Add section" defaultValue="" onChange={e => { if (e.target.value) setSections(s => [...s, blankSection(e.target.value as SectionType)]); e.target.value = ""; }}><option value="">+ Add section</option>{sectionTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
          {ordered.map((section, index) => <article className="lp-section-card" key={section.id} draggable onDragStart={event => { setDraggedSectionId(section.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", section.id); }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={event => { event.preventDefault(); const sourceId = draggedSectionId || event.dataTransfer.getData("text/plain"); const from = sections.findIndex(item => item.id === sourceId); const to = sections.findIndex(item => item.id === section.id); if (from >= 0 && to >= 0 && from !== to) setSections(current => { const next = [...current]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; }); setDraggedSectionId(null); }} onDragEnd={() => setDraggedSectionId(null)} style={{ opacity: draggedSectionId === section.id ? 0.55 : 1, cursor: "grab" }}><div className="lp-section-top"><strong>{section.type} <span aria-hidden="true">⋮⋮</span></strong><div><button type="button" aria-label={`Move ${section.type} up`} disabled={index === 0} onClick={() => moveSection(index, -1)}>↑</button><button type="button" aria-label={`Move ${section.type} down`} disabled={index === sections.length - 1} onClick={() => moveSection(index, 1)}>↓</button><button type="button" onClick={() => setSections(s => s.filter(item => item.id !== section.id))}>Remove</button></div></div><label>Heading<input value={section.title} onChange={e => updateSection(section.id, { title: e.target.value })} /></label><label>Content<textarea rows={3} value={section.body} onChange={e => updateSection(section.id, { body: e.target.value })} /></label>{(section.type === "HERO" || section.type === "CTA") && <div className="lp-fields"><label>Button label<input value={section.buttonText} onChange={e => updateSection(section.id, { buttonText: e.target.value })} /></label><label>Button URL<input value={section.buttonUrl} onChange={e => updateSection(section.id, { buttonUrl: e.target.value })} /></label></div>}</article>)}
          <div className="lp-seo"><h3>Search engine preview</h3><label>SEO title<input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder={title} /></label><label>Meta description<textarea rows={2} value={seoDescription} onChange={e => setSeoDescription(e.target.value)} placeholder="Describe this page for search results." /></label></div>
          {selected && <button className="lp-delete" onClick={() => void removePage()}>Delete page</button>}
        </> : <div className="lp-preview"><div className="lp-preview-nav">YOUR STORE <span>New collection　 About　 Contact</span></div>{sections.map(section => <section key={section.id} className={section.type === "HERO" ? "lp-preview-hero" : "lp-preview-section"}><small>{section.type}</small><h2>{section.title}</h2><p>{section.body}</p>{section.buttonText && <span className="lp-preview-button">{section.buttonText}</span>}</section>)}</div>}
      </div>
    </div>
  </section>;
}
