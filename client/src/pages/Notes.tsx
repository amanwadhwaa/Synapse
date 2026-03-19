import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Image, Mic, Calendar, Tag, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Note {
  id: string;
  userId: string;
  subjectId?: string;
  subject?: { name: string };
  rawText: string;
  extractedText?: string;
  sourceType: 'TYPED' | 'IMAGE' | 'AUDIO';
  fileUrl?: string;
  createdAt: string;
  title?: string;
}

interface Subject {
  id: string;
  name: string;
}

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [creatingSubject, setCreatingSubject] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  useEffect(() => {
    fetchNotes();
    fetchSubjects();
  }, []);

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

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setExtractedText('');
    setImageError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/notes/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedText(data.extractedText || 'No text extracted from image');
        toast.success('Image processed successfully!');
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.error || 'Failed to process image';
        setImageError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to upload image';
      setImageError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'TYPED':
        return <FileText className="h-4 w-4" />;
      case 'IMAGE':
        return <Image className="h-4 w-4" />;
      case 'AUDIO':
        return <Mic className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-4xl text-white mb-2 tracking-tight">Notes</h1>
          <p className="text-neutral-400 font-light">Create and manage your study notes</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>New Note</span>
        </button>
      </div>

      {/* Create Note Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border-violet-500/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl text-white">Create New Note</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                  placeholder="Enter note title..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Subject (Optional)</label>
                <div className="flex gap-2">
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="flex-1 px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
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
                    className="px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-xl text-white transition-colors"
                    title="Create new subject"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 resize-none"
                  placeholder="Write your note content here..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl text-white">Create New Subject</h2>
              <button
                onClick={() => {
                  setShowCreateSubject(false);
                  setNewSubjectName('');
                }}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Subject Name</label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createSubject()}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
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
                  className="px-6 py-3 border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createSubject}
                  disabled={creatingSubject}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 text-white rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-violet-500/40 transition-all duration-300 cursor-pointer hover:bg-white/[0.01]"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 text-neutral-500 mx-auto mb-4" />
          <p className="text-white text-lg mb-2">Upload an image to extract text</p>
          <p className="text-neutral-500 font-light">Drag and drop an image here, or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {uploadingImage && (
          <div className="mt-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto"></div>
            <p className="text-neutral-400 mt-2">Processing image...</p>
          </div>
        )}

        {imageError && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-300 text-sm">{imageError}</p>
          </div>
        )}

        {extractedText && (
          <div className="mt-6 glass-card rounded-2xl p-6">
            <h3 className="font-serif text-lg text-white mb-4">Extracted Text</h3>
            <div className="bg-[#0a0a0a] rounded-xl p-4 max-h-64 overflow-y-auto border border-white/5">
              <pre className="text-neutral-300 whitespace-pre-wrap text-sm">{extractedText}</pre>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setContent(extractedText);
                  setTitle('Extracted from Image');
                  setShowCreateForm(true);
                }}
                className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/20"
              >
                Use as Note
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.map((note) => (
          <Link
            key={note.id}
            to={`/notes/${note.id}`}
            className="group glass-card rounded-2xl p-6 hover:bg-white/[0.04] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_25px_-10px_rgba(139,92,246,0.3)] hover:border-violet-500/30"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2 text-violet-400">
                {getSourceIcon(note.sourceType)}
                <span className="text-xs uppercase tracking-widest text-neutral-500">
                  {note.sourceType}
                </span>
              </div>
              {note.subject && (
                <div className="flex items-center space-x-1 text-xs text-neutral-500">
                  <Tag className="h-3 w-3" />
                  <span>{note.subject.name}</span>
                </div>
              )}
            </div>

            <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
              {note.title || note.rawText.split('\n')[0] || 'Untitled Note'}
            </h3>

            <p className="text-neutral-500 text-sm line-clamp-3 mb-4 font-light">
              {note.rawText}
            </p>

            <div className="flex items-center text-xs text-neutral-600">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{formatDate(note.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>

      {notes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-neutral-600 mx-auto mb-4" />
          <h3 className="font-serif text-xl text-white mb-2">No notes yet</h3>
          <p className="text-neutral-500 mb-6 font-light">Create your first note to get started</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/20 inline-flex items-center space-x-2"
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