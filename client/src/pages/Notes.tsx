import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Image, Calendar, Tag, Upload, X, File as FileIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Note {
  id: string;
  userId: string;
  subjectId?: string;
  subject?: { name: string };
  rawText: string;
  extractedText?: string;
  sourceType: 'TYPED' | 'IMAGE' | 'AUDIO' | 'PDF';
  fileUrl?: string;
  originalFileName?: string;
  pageCount?: number | null;
  createdAt: string;
  title?: string;
}

interface Subject {
  id: string;
  name: string;
}

const Notes: React.FC = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [imageError, setImageError] = useState('');
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [deletingNote, setDeletingNote] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  useEffect(() => {
    fetchNotes();
    fetchSubjects();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/notes', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      toast.error('Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const createSubject = async () => {
    if (!newSubjectName.trim()) {
      toast.error('Please enter a subject name');
      return;
    }

    setCreatingSubject(true);
    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: newSubjectName.trim(),
        }),
      });

      if (response.ok) {
        const newSubject = await response.json();
        setSubjects([...subjects, newSubject]);
        setSelectedSubjectId(newSubject.id);
        setNewSubjectName('');
        setShowCreateSubject(false);
        toast.success('Subject created!');
      } else {
        toast.error('Failed to create subject');
      }
    } catch (error) {
      toast.error('Failed to create subject');
    } finally {
      setCreatingSubject(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('Please fill in the content');
      return;
    }

    try {
      const response = await fetch('/api/notes/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title,
          rawText: content,
          subjectId: selectedSubjectId || undefined,
        }),
      });

      if (response.ok) {
        toast.success('Note created successfully!');
        setTitle('');
        setContent('');
        setSelectedSubjectId('');
        setShowCreateForm(false);
        fetchNotes();
      } else {
        toast.error('Failed to create note');
      }
    } catch (error) {
      toast.error('Failed to create note');
    }
  };

  const handleFileUpload = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    setUploadingFile(true);
    setImageError('');
    const toastId = toast.loading('Processing your file with AI...');

    const formData = new FormData();
    formData.append(isPdf ? 'pdf' : 'image', file);

    try {
      const response = await fetch(isPdf ? '/api/notes/upload-pdf' : '/api/notes/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();

        toast.success('Note created successfully!', { id: toastId });
        setSelectedUploadFile(null);
        if (imagePreviewUrl) {
          URL.revokeObjectURL(imagePreviewUrl);
          setImagePreviewUrl(null);
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        if (data?.note?.id) {
          navigate(`/notes/${data.note.id}`);
        } else {
          await fetchNotes();
          navigate('/notes');
        }
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.error || `Failed to process ${isPdf ? 'PDF' : 'image'}`;
        setImageError(errorMsg);
        toast.error(errorMsg, { id: toastId });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : `Failed to upload ${isPdf ? 'PDF' : 'image'}`;
      setImageError(errorMsg);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setUploadingFile(false);
    }
  };

  const updateSelectedUploadFile = (file: File) => {
    setSelectedUploadFile(file);

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    if (file.type.startsWith('image/')) {
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setImagePreviewUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      updateSelectedUploadFile(file);
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      updateSelectedUploadFile(file);
      handleFileUpload(file);
    }
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete || deletingNote) return;

    setDeletingNote(true);
    try {
      const response = await fetch(`/api/notes/${noteToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete note');
      }

      setNotes((prev) => prev.filter((note) => note.id !== noteToDelete.id));
      setNoteToDelete(null);
      toast.success('Note deleted successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete note';
      toast.error(message);
    } finally {
      setDeletingNote(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const getNoteDescription = (note: Note) => {
    if (note.sourceType === 'IMAGE') {
      return 'Image note - AI analyzed';
    }

    if (note.sourceType === 'PDF') {
      const fileName = note.originalFileName || note.title || 'Document';
      return `${fileName} - PDF note - AI analyzed`;
    }

    if (note.sourceType === 'TYPED') {
      const content = (note.rawText || '').replace(/\s+/g, ' ').trim();
      return content.length > 60 ? `${content.slice(0, 60)}...` : content || 'Typed note';
    }

    return 'Audio note';
  };

  const getTypeIconMeta = (sourceType: Note['sourceType']) => {
    if (sourceType === 'IMAGE') {
      return { emoji: '📷', bgClass: 'bg-blue-500/20 text-blue-200 border-blue-400/30' };
    }
    if (sourceType === 'PDF') {
      return { emoji: '📄', bgClass: 'bg-red-500/20 text-red-200 border-red-400/30' };
    }
    return { emoji: '✏️', bgClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Notes</h1>
          <p className="text-gray-400">Create and manage your study notes</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-[var(--color-primary)] hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>New Note</span>
        </button>
      </div>

      {/* Create Note Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create New Note</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="Enter note title..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject (Optional)</label>
                <div className="flex gap-2">
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="">Select a subject...</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCreateSubject(true)}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-colors"
                    title="Create new subject"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--color-primary)] resize-none"
                  placeholder="Write your note content here..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[var(--color-primary)] hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Create Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Subject Modal */}
      {showCreateSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create New Subject</h2>
              <button
                onClick={() => {
                  setShowCreateSubject(false);
                  setNewSubjectName('');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject Name</label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createSubject()}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="e.g., Data Structures, Machine Learning..."
                  autoFocus
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowCreateSubject(false);
                    setNewSubjectName('');
                  }}
                  className="px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createSubject}
                  disabled={creatingSubject}
                  className="px-6 py-3 bg-[var(--color-primary)] hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingSubject ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Section */}
      <div className="mb-8">
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-[var(--color-primary)] transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-white text-lg mb-2">Upload an image or PDF to extract text</p>
          <p className="text-gray-400">Drag and drop an image or PDF here, or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {selectedUploadFile && (
          <div className="mt-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              {selectedUploadFile.type === 'application/pdf' ? (
                <div className="h-14 w-14 rounded-lg bg-red-500/15 border border-red-400/30 flex items-center justify-center">
                  <FileIcon className="h-7 w-7 text-red-300" />
                </div>
              ) : imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt="Selected upload"
                  className="h-14 w-14 rounded-lg object-cover border border-white/10"
                />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Image className="h-6 w-6 text-gray-300" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{selectedUploadFile.name}</p>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 mt-1 text-xs bg-white/10 text-gray-300 border border-white/15">
                  {selectedUploadFile.type === 'application/pdf' ? 'PDF' : 'IMAGE'}
                </span>
              </div>
            </div>
          </div>
        )}

        {uploadingFile && (
          <div className="mt-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mx-auto"></div>
            <p className="text-gray-400 mt-2">Processing your file with AI...</p>
          </div>
        )}

        {imageError && (
          <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-300 text-sm">{imageError}</p>
          </div>
        )}
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {sortedNotes.map((note) => {
          const iconMeta = getTypeIconMeta(note.sourceType);

          return (
          <div
            key={note.id}
            className="group relative flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
          >
            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-blue-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100"></span>

            <Link to={`/notes/${note.id}`} className="flex min-w-0 flex-1 items-center gap-4">
              <div className={`h-12 w-12 shrink-0 rounded-lg border flex items-center justify-center text-xl ${iconMeta.bgClass}`}>
                <span aria-hidden="true">{iconMeta.emoji}</span>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-white font-semibold text-base truncate">
                    {note.title || note.originalFileName || 'Untitled Note'}
                  </h3>
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-200">
                    {note.sourceType}
                  </span>
                  {note.subject && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                      <Tag className="h-3 w-3" />
                      <span className="truncate max-w-28">{note.subject.name}</span>
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-400 truncate">{getNoteDescription(note)}</p>
              </div>
            </Link>

            <div className="shrink-0 flex items-center gap-4">
              <div className="hidden sm:flex items-center text-xs text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{formatDate(note.createdAt)}</span>
              </div>
              <Link
                to={`/notes/${note.id}`}
                className="inline-flex items-center rounded-lg border border-blue-400/30 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-200 group-hover:bg-blue-500/25 transition-colors"
              >
                Open
              </Link>
              <button
                type="button"
                onClick={() => setNoteToDelete(note)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 opacity-30 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                aria-label="Delete note"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-white mb-3">Delete Note</h3>
            <p className="text-sm text-gray-300 mb-6">
              Are you sure you want to delete this note? This will also delete all quizzes and chat history associated with it.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                disabled={deletingNote}
                className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteNote}
                disabled={deletingNote}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {deletingNote ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {notes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No notes yet</h3>
          <p className="text-gray-400 mb-6">Create your first note to get started</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-[var(--color-primary)] hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors inline-flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create Note</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Notes;