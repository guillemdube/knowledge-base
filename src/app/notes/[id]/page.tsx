"use client";

import { useState, useEffect, useCallback, use } from "react";
import { trpc } from "@/lib/trpc-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const utils = trpc.useUtils();

  const noteQuery = trpc.notes.getById.useQuery({ id });
  const notesListQuery = trpc.notes.list.useQuery();
  const tagsQuery = trpc.tags.list.useQuery();

  const updateNote = trpc.notes.update.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      setLastSaved(new Date());
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  const archiveNote = trpc.notes.archive.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      router.push("/dashboard");
    },
  });

  const unarchiveNote = trpc.notes.unarchive.useMutation({
    onSuccess: () => {
      utils.notes.getById.invalidate({ id });
      utils.notes.list.invalidate();
    },
  });

  const deleteNote = trpc.notes.delete.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
    },
  });

  const linkNote = trpc.notes.link.useMutation({
    onSuccess: () => {
      utils.notes.getById.invalidate({ id });
      setShowLinkModal(false);
    },
  });

  const unlinkNote = trpc.notes.unlink.useMutation({
    onSuccess: () => {
      utils.notes.getById.invalidate({ id });
    },
  });

  const assignTag = trpc.tags.assignToNote.useMutation({
    onSuccess: () => {
      utils.notes.getById.invalidate({ id });
      setShowTagModal(false);
    },
  });

  const removeTag = trpc.tags.removeFromNote.useMutation({
    onSuccess: () => {
      utils.notes.getById.invalidate({ id });
    },
  });

  // Load note data
  useEffect(() => {
    if (noteQuery.data) {
      setTitle(noteQuery.data.title);
      setContent(noteQuery.data.content);
    }
  }, [noteQuery.data]);

  // Auto-save with debounce
  const autoSave = useCallback(
    (newTitle: string, newContent: string) => {
      if (!noteQuery.data) return;
      if (newTitle === noteQuery.data.title && newContent === noteQuery.data.content) return;

      setIsSaving(true);
      updateNote.mutate({
        id,
        title: newTitle || undefined,
        content: newContent,
      });
    },
    [id, noteQuery.data, updateNote]
  );

  useEffect(() => {
    if (!noteQuery.data) return;

    const timer = setTimeout(() => {
      autoSave(title, content);
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, content, autoSave, noteQuery.data]);

  if (noteQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-400">
        Loading...
      </div>
    );
  }

  if (noteQuery.error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] text-zinc-400">
        <p>Note not found</p>
        <Link href="/dashboard" className="mt-4 text-blue-400 hover:text-blue-300">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const note = noteQuery.data!;

  // Build backlinks
  const linkedNotes = [
    ...(note.linksFrom?.map((l) => ({ id: l.toNote.id, title: l.toNote.title, direction: "→" as const })) ?? []),
    ...(note.linksTo?.map((l) => ({ id: l.fromNote.id, title: l.fromNote.title, direction: "←" as const })) ?? []),
  ];

  // Available notes to link (exclude self and already linked)
  const linkedIds = new Set(linkedNotes.map((n) => n.id));
  const availableToLink = notesListQuery.data?.filter(
    (n) => n.id !== id && !linkedIds.has(n.id)
  );

  // Available tags (exclude already assigned)
  const assignedTagIds = new Set(note.tags.map((nt) => nt.tag.id));
  const availableTags = tagsQuery.data?.filter((t) => !assignedTagIds.has(t.id));

  // Simple Markdown to HTML converter
  const renderMarkdown = (md: string) => {
    let html = md
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/gim, "<em>$1</em>")
      .replace(/`(.*?)`/gim, "<code>$1</code>")
      .replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>")
      .replace(/^- (.*$)/gim, "<li>$1</li>")
      .replace(/\n/gim, "<br>");

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((<li>.*?<\/li><br>?)+)/g, "<ul>$1</ul>");

    return html;
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 hover:text-white"
          >
            ← Dashboard
          </Link>
          <span className="text-xs text-zinc-600">
            {isSaving ? "Saving..." : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`rounded px-3 py-1 text-xs transition-colors ${
              isPreview
                ? "bg-blue-600/20 text-blue-400"
                : "text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {isPreview ? "Edit" : "Preview"}
          </button>

          <button
            onClick={() => setShowTagModal(true)}
            className="rounded px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            Tags
          </button>

          <button
            onClick={() => setShowLinkModal(true)}
            className="rounded px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            Link
          </button>

          {note.is_archived ? (
            <button
              onClick={() => unarchiveNote.mutate({ id })}
              className="rounded px-3 py-1 text-xs text-yellow-400 hover:bg-zinc-800"
            >
              Unarchive
            </button>
          ) : (
            <button
              onClick={() => archiveNote.mutate({ id })}
              className="rounded px-3 py-1 text-xs text-yellow-400 hover:bg-zinc-800"
            >
              Archive
            </button>
          )}

          <button
            onClick={() => {
              if (confirm("Permanently delete this note?")) {
                deleteNote.mutate({ id });
              }
            }}
            className="rounded px-3 py-1 text-xs text-red-400 hover:bg-zinc-800"
          >
            Delete
          </button>
        </div>
      </header>

      {/* Tags bar */}
      {note.tags.length > 0 && (
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
          {note.tags.map((nt) => (
            <span
              key={nt.tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
            >
              {nt.tag.name}
              <button
                onClick={() => removeTag.mutate({ noteId: id, tagId: nt.tag.id })}
                className="text-zinc-500 hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Editor */}
      <div className="flex flex-1 flex-col px-6 py-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4 bg-transparent text-3xl font-bold text-white placeholder-zinc-600 focus:outline-none"
          placeholder="Note title..."
        />

        {isPreview ? (
          <div
            className="markdown-content flex-1 text-zinc-300"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 resize-none bg-transparent font-mono text-sm leading-relaxed text-zinc-300 placeholder-zinc-600 focus:outline-none"
            placeholder="Start writing in Markdown..."
          />
        )}
      </div>

      {/* Linked notes section */}
      {linkedNotes.length > 0 && (
        <div className="border-t border-zinc-800 px-6 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Linked Notes
          </h3>
          <div className="flex flex-wrap gap-2">
            {linkedNotes.map((linked) => (
              <div
                key={`${linked.direction}-${linked.id}`}
                className="group flex items-center gap-1 rounded-lg border border-zinc-800 px-3 py-1.5"
              >
                <span className="text-xs text-zinc-500">{linked.direction}</span>
                <Link
                  href={`/notes/${linked.id}`}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  {linked.title}
                </Link>
                <button
                  onClick={() =>
                    unlinkNote.mutate(
                      linked.direction === "→"
                        ? { fromNoteId: id, toNoteId: linked.id }
                        : { fromNoteId: linked.id, toNoteId: id }
                    )
                  }
                  className="hidden text-xs text-zinc-500 hover:text-red-400 group-hover:block"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Link to Note</h2>
            {availableToLink && availableToLink.length > 0 ? (
              <div className="max-h-64 space-y-1 overflow-auto">
                {availableToLink.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => linkNote.mutate({ fromNoteId: id, toNoteId: n.id })}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    {n.title}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No other notes to link.</p>
            )}
            <button
              onClick={() => setShowLinkModal(false)}
              className="mt-4 w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Tag modal */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Assign Tags</h2>
            {availableTags && availableTags.length > 0 ? (
              <div className="max-h-64 space-y-1 overflow-auto">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => assignTag.mutate({ noteId: id, tagId: tag.id })}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                No tags available. Create tags from the dashboard sidebar.
              </p>
            )}
            <button
              onClick={() => setShowTagModal(false)}
              className="mt-4 w-full rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
