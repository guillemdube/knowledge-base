"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const utils = trpc.useUtils();

  const notesQuery = trpc.notes.list.useQuery({ includeArchived: showArchived });
  const tagsQuery = trpc.tags.list.useQuery();
  const searchResults = trpc.search.notes.useQuery(
    { query: searchQuery, tags: selectedTags.length > 0 ? selectedTags : undefined, includeArchived: showArchived },
    { enabled: searchQuery.length > 0 || selectedTags.length > 0 }
  );
  const meQuery = trpc.auth.me.useQuery();

  const createNote = trpc.notes.create.useMutation({
    onSuccess: (note) => {
      utils.notes.list.invalidate();
      setNewNoteTitle("");
      setShowNewNoteForm(false);
      router.push(`/notes/${note.id}`);
    },
  });

  const archiveNote = trpc.notes.archive.useMutation({
    onSuccess: () => utils.notes.list.invalidate(),
  });

  const deleteNote = trpc.notes.delete.useMutation({
    onSuccess: () => utils.notes.list.invalidate(),
  });

  const createTag = trpc.tags.create.useMutation({
    onSuccess: () => {
      utils.tags.list.invalidate();
      setNewTagName("");
      setShowNewTagForm(false);
    },
  });

  const deleteTag = trpc.tags.delete.useMutation({
    onSuccess: () => utils.tags.list.invalidate(),
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      router.push("/login");
      router.refresh();
    },
  });

  const displayedNotes = searchQuery.length > 0 || selectedTags.length > 0
    ? searchResults.data ?? []
    : notesQuery.data ?? [];

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNoteTitle.trim()) {
      createNote.mutate({ title: newNoteTitle.trim() });
    }
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      createTag.mutate({ name: newTagName.trim() });
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
          <h1 className="text-lg font-bold text-white">KB</h1>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Logout
          </button>
        </div>

        {meQuery.data && (
          <div className="border-b border-zinc-800 px-4 py-2 text-xs text-zinc-500">
            {meQuery.data.email}
          </div>
        )}

        {/* Tags section */}
        <div className="border-b border-zinc-800 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Tags
            </h2>
            <button
              onClick={() => setShowNewTagForm(!showNewTagForm)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              +
            </button>
          </div>

          {showNewTagForm && (
            <form onSubmit={handleCreateTag} className="mb-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
            </form>
          )}

          <div className="space-y-1">
            {tagsQuery.data?.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between group">
                <button
                  onClick={() => toggleTag(tag.id)}
                  className={`flex-1 rounded px-2 py-1 text-left text-xs transition-colors ${
                    selectedTags.includes(tag.id)
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {tag.name}
                  <span className="ml-1 text-zinc-500">({tag._count.notes})</span>
                </button>
                <button
                  onClick={() => deleteTag.mutate({ id: tag.id })}
                  className="hidden px-1 text-xs text-zinc-500 hover:text-red-400 group-hover:block"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Archive toggle */}
        <div className="p-4">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Show archived
          </label>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="flex items-center gap-4 border-b border-zinc-800 px-6 py-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search notes... (title, content)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowNewNoteForm(true)}
            className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            + New Note
          </button>
        </div>

        {/* New note form */}
        {showNewNoteForm && (
          <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
            <form onSubmit={handleCreateNote} className="flex gap-2">
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Note title..."
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={createNote.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowNewNoteForm(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Notes list */}
        <div className="p-6">
          {selectedTags.length > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs text-zinc-400">Filtering by:</span>
              {selectedTags.map((tagId) => {
                const tag = tagsQuery.data?.find((t) => t.id === tagId);
                return (
                  <span
                    key={tagId}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-600/20 px-2 py-0.5 text-xs text-blue-400"
                  >
                    {tag?.name}
                    <button onClick={() => toggleTag(tagId)} className="hover:text-white">
                      ×
                    </button>
                  </span>
                );
              })}
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-zinc-500 hover:text-white"
              >
                Clear all
              </button>
            </div>
          )}

          {displayedNotes.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              {searchQuery || selectedTags.length > 0
                ? "No notes match your search"
                : "No notes yet. Create your first note!"}
            </div>
          ) : (
            <div className="space-y-2">
              {displayedNotes.map((note) => (
                <div
                  key={note.id}
                  className="group flex items-center justify-between rounded-lg border border-zinc-800 px-4 py-3 transition-all hover:border-zinc-700 hover:bg-zinc-900/50"
                >
                  <Link
                    href={`/notes/${note.id}`}
                    className="flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{note.title}</h3>
                      {note.is_archived && (
                        <span className="rounded bg-yellow-600/20 px-1.5 py-0.5 text-[10px] text-yellow-400">
                          archived
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-zinc-500">
                        {new Date(note.updated_at).toLocaleDateString()}
                      </span>
                      {note.tags.map((nt) => (
                        <span
                          key={nt.tag.id}
                          className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400"
                        >
                          {nt.tag.name}
                        </span>
                      ))}
                    </div>
                    {note.content && (
                      <p className="mt-1 line-clamp-1 text-sm text-zinc-500">
                        {note.content.slice(0, 120)}
                      </p>
                    )}
                  </Link>

                  <div className="hidden items-center gap-1 group-hover:flex">
                    {!note.is_archived ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          archiveNote.mutate({ id: note.id });
                        }}
                        className="rounded p-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-yellow-400"
                        title="Archive"
                      >
                        📁
                      </button>
                    ) : null}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm("Permanently delete this note?")) {
                          deleteNote.mutate({ id: note.id });
                        }
                      }}
                      className="rounded p-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
