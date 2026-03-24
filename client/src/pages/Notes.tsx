import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  Image,
  Calendar,
  Tag,
  Upload,
  X,
  File as FileIcon,
  Trash2,
  Mic,
  Square,
  AudioLines,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Note {
  id: string;
  userId: string;
  subjectId?: string;
  subject?: { name: string };
  rawText: string;
  extractedText?: string;
  sourceType: 'TYPED' | 'IMAGE' | 'AUDIO' | 'PDF' | 'VOICE';
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

const recorderMimeTypePriority = [
  'audio/wav',
  'audio/webm;codecs=pcm',
  'audio/webm',
  'audio/ogg',
];

const pickBestRecorderMimeType = () =>
  recorderMimeTypePriority.find((type) => MediaRecorder.isTypeSupported(type));

const extensionFromMimeType = (mimeType?: string) => {
  if (!mimeType) {
    return 'webm';
  }

  if (mimeType.includes('wav')) {
    return 'wav';
  }

  if (mimeType.includes('ogg')) {
    return 'ogg';
  }

  return 'webm';
};

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
  const [showUploadDetailsForm, setShowUploadDetailsForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSelectedSubjectId, setUploadSelectedSubjectId] = useState('');
  const [uploadNewSubjectName, setUploadNewSubjectName] = useState('');
  const [uploadSubjects, setUploadSubjects] = useState<Subject[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingPreviewUrl, setRecordingPreviewUrl] = useState<string | null>(null);
  const [showVoiceDetailsForm, setShowVoiceDetailsForm] = useState(false);
  const [voiceTitle, setVoiceTitle] = useState('');
  const [voiceSelectedSubjectId, setVoiceSelectedSubjectId] = useState('');
  const [voiceNewSubjectName, setVoiceNewSubjectName] = useState('');
  const [voiceMode, setVoiceMode] = useState<'new' | 'append'>('new');
  const [voiceTargetNoteId, setVoiceTargetNoteId] = useState('');
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const recordingDurationRef = useRef(0);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [deletingNote, setDeletingNote] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  useEffect(() => {
    fetchNotes();
    fetchSubjects();
    fetchUploadSubjectsFromNotes();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }

      if (recordingPreviewUrl) {
        URL.revokeObjectURL(recordingPreviewUrl);
      }

      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
      }
    };
  }, [imagePreviewUrl, recordingPreviewUrl]);

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
        const createdSubject = await response.json();
        setSubjects((prev) => {
          const alreadyExists = prev.some((subject) => subject.id === createdSubject.id);
          return alreadyExists ? prev : [...prev, createdSubject];
        });
        setUploadSubjects((prev) => {
          const alreadyExists = prev.some((subject) => subject.id === createdSubject.id);
          return alreadyExists ? prev : [...prev, createdSubject];
        });
        setSelectedSubjectId(createdSubject.id);
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

  const fetchUploadSubjectsFromNotes = async () => {
    try {
      const response = await fetch('/api/subjects/from-notes', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUploadSubjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch upload subjects:', error);
    }
  };

  const resetUploadFlowState = () => {
    setShowUploadDetailsForm(false);
    setUploadTitle('');
    setUploadSelectedSubjectId('');
    setUploadNewSubjectName('');
    setSelectedUploadFile(null);

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatRecordingDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const stopRecordingTimer = () => {
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const resetVoiceFlowState = () => {
    setShowVoiceDetailsForm(false);
    setVoiceTitle('');
    setVoiceSelectedSubjectId('');
    setVoiceNewSubjectName('');
    setVoiceMode('new');
    setVoiceTargetNoteId('');
    setVoiceError('');
    setRecordingDuration(0);
    recordingDurationRef.current = 0;

    if (recordingPreviewUrl) {
      URL.revokeObjectURL(recordingPreviewUrl);
      setRecordingPreviewUrl(null);
    }

    setRecordingBlob(null);
  };

  const startRecording = async () => {
    if (isRecording) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Your browser does not support microphone recording');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const chosenMimeType = pickBestRecorderMimeType();

      const recorder = new MediaRecorder(
        stream,
        chosenMimeType ? { mimeType: chosenMimeType } : undefined,
      );

      recordingChunksRef.current = [];
      setVoiceError('');
      setRecordingDuration(0);
      recordingDurationRef.current = 0;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopRecordingTimer();
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        setRecordingBlob(blob);

        if (recordingPreviewUrl) {
          URL.revokeObjectURL(recordingPreviewUrl);
        }

        const previewUrl = URL.createObjectURL(blob);
        setRecordingPreviewUrl(previewUrl);

        stream.getTracks().forEach((track) => track.stop());

        if (recordingDurationRef.current < 2) {
          toast.error('Recording is too short. Please record at least 2 seconds.');
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      recordingIntervalRef.current = window.setInterval(() => {
        recordingDurationRef.current += 1;
        setRecordingDuration(recordingDurationRef.current);
      }, 1000);
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access and try again.'
          : 'Unable to start recording. Please try again.';
      toast.error(message);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
      return;
    }

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const openVoiceDetailsForm = () => {
    if (!recordingBlob) {
      toast.error('Please record audio first');
      return;
    }

    if (recordingDuration < 2) {
      toast.error('Recording is too short. Please record at least 2 seconds.');
      return;
    }

    const defaultTitle = `Voice Note ${new Date().toLocaleString()}`;
    setVoiceTitle(defaultTitle);
    setShowVoiceDetailsForm(true);
  };

  const retryVoiceRecording = () => {
    if (recordingPreviewUrl) {
      URL.revokeObjectURL(recordingPreviewUrl);
      setRecordingPreviewUrl(null);
    }

    setRecordingBlob(null);
    setVoiceError('');
    setShowVoiceDetailsForm(false);
    setRecordingDuration(0);
    recordingDurationRef.current = 0;
  };

  const submitVoiceRecording = async () => {
    if (!recordingBlob) {
      toast.error('No recording found');
      return;
    }

    if (recordingDuration < 2) {
      toast.error('Recording is too short. Please record at least 2 seconds.');
      return;
    }

    if (voiceMode === 'new' && !voiceTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (voiceMode === 'new' && voiceSelectedSubjectId && voiceNewSubjectName.trim()) {
      toast.error('Choose an existing subject OR type a new one, not both');
      return;
    }

    if (voiceMode === 'append' && !voiceTargetNoteId) {
      toast.error('Please select a note to append to');
      return;
    }

    const effectiveMimeType = recordingBlob.type || pickBestRecorderMimeType() || 'audio/webm';
    const extension = extensionFromMimeType(effectiveMimeType);
    const filename = `voice-recording-${Date.now()}.${extension}`;
    const uploadBlob =
      recordingBlob.type === effectiveMimeType
        ? recordingBlob
        : new Blob([recordingBlob], { type: effectiveMimeType });

    const formData = new FormData();
    formData.append('audio', uploadBlob, filename);
    formData.append('mode', voiceMode);

    if (voiceMode === 'new') {
      formData.append('title', voiceTitle.trim());

      if (voiceSelectedSubjectId) {
        const selectedSubject = uploadSubjects.find((subject) => subject.id === voiceSelectedSubjectId);
        formData.append('subjectId', voiceSelectedSubjectId);
        if (selectedSubject) {
          formData.append('subject', selectedSubject.name);
        }
      }

      if (voiceNewSubjectName.trim()) {
        formData.append('subject', voiceNewSubjectName.trim());
        formData.append('subjectName', voiceNewSubjectName.trim());
      }
    } else {
      formData.append('noteId', voiceTargetNoteId);
    }

    setUploadingVoice(true);
    setVoiceError('');
    const toastId = toast.loading('Transcribing your recording...');

    try {
      const response = await fetch('/api/notes/voice-transcribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || 'Failed to transcribe recording';
        setVoiceError(message);
        toast.error(message, { id: toastId });
        return;
      }

      const data = await response.json();
      if (data?.translationFailed) {
        toast.error('Note saved in original language — translation failed', { id: toastId });
      } else {
        toast.success('Voice note processed successfully!', { id: toastId });
      }
      resetVoiceFlowState();
      await Promise.all([fetchNotes(), fetchSubjects(), fetchUploadSubjectsFromNotes()]);

      if (data?.noteId) {
        navigate(`/notes/${data.noteId}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to transcribe recording';
      setVoiceError(message);
      toast.error(message, { id: toastId });
    } finally {
      setUploadingVoice(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedUploadFile) {
      toast.error('Please select a file');
      return;
    }

    const trimmedUploadTitle = uploadTitle.trim();
    if (!trimmedUploadTitle) {
      toast.error('Please enter a title');
      return;
    }

    if (uploadSelectedSubjectId && uploadNewSubjectName.trim()) {
      toast.error('Choose an existing subject OR type a new one, not both');
      return;
    }

    const isPdf =
      selectedUploadFile.type === 'application/pdf' ||
      selectedUploadFile.name.toLowerCase().endsWith('.pdf');

    setUploadingFile(true);
    setImageError('');
    const toastId = toast.loading('Processing your file with AI...');

    const formData = new FormData();
    formData.append(isPdf ? 'pdf' : 'image', selectedUploadFile);
    formData.append('title', trimmedUploadTitle);
    
    console.log('Uploading with title:', trimmedUploadTitle);
    console.log('Selected subject ID:', uploadSelectedSubjectId);
    console.log('New subject name:', uploadNewSubjectName.trim());

    if (uploadSelectedSubjectId) {
      formData.append('subjectId', uploadSelectedSubjectId);
    }

    if (uploadNewSubjectName.trim()) {
      formData.append('subjectName', uploadNewSubjectName.trim());
    }

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
        resetUploadFlowState();
        await Promise.all([fetchNotes(), fetchSubjects(), fetchUploadSubjectsFromNotes()]);

        if (data?.note?.id) {
          navigate(`/notes/${data.note.id}`);
        } else {
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
    setImageError('');

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    if (file.type.startsWith('image/')) {
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setImagePreviewUrl(null);
    }

    const defaultTitle = file.name.replace(/\.[^.]+$/, '').trim() || 'Untitled Note';
    setUploadTitle(defaultTitle);
    setUploadSelectedSubjectId('');
    setUploadNewSubjectName('');
    setShowUploadDetailsForm(true);
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
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      updateSelectedUploadFile(file);
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
    if (note.subject?.name) {
      return note.subject.name;
    }

    if (note.sourceType === 'IMAGE') {
      return 'Image note';
    }

    if (note.sourceType === 'PDF') {
      const fileName = note.originalFileName || note.title || 'Document';
      return `${fileName} - PDF`;
    }

    if (note.sourceType === 'TYPED') {
      const content = (note.rawText || '').replace(/\s+/g, ' ').trim();
      return content.length > 60 ? `${content.slice(0, 60)}...` : content || 'Typed note';
    }

    if (note.sourceType === 'VOICE') {
      return 'Voice note - translated to English';
    }

    if (note.sourceType === 'AUDIO') {
      return 'Voice recording note';
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
    if (sourceType === 'VOICE' || sourceType === 'AUDIO') {
      return { emoji: '🎙️', bgClass: 'bg-purple-500/20 text-purple-200 border-purple-400/30' };
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

      {showUploadDetailsForm && selectedUploadFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Add Note Details</h2>
              <button
                onClick={resetUploadFlowState}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={uploadingFile}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">File</label>
                <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 p-3">
                  {selectedUploadFile.type === 'application/pdf' ? (
                    <div className="h-12 w-12 rounded-lg bg-red-500/15 border border-red-400/30 flex items-center justify-center">
                      <FileIcon className="h-6 w-6 text-red-300" />
                    </div>
                  ) : imagePreviewUrl ? (
                    <img
                      src={imagePreviewUrl}
                      alt="Selected upload"
                      className="h-12 w-12 rounded-lg object-cover border border-white/10"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <Image className="h-5 w-5 text-gray-300" />
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="Enter note title..."
                  required
                  disabled={uploadingFile}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject (Optional)</label>
                <select
                  value={uploadSelectedSubjectId}
                  onChange={(e) => {
                    setUploadSelectedSubjectId(e.target.value);
                    if (e.target.value) {
                      setUploadNewSubjectName('');
                    }
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)]"
                  disabled={uploadingFile || uploadNewSubjectName.trim().length > 0}
                >
                  <option value="">Select an existing subject from your notes...</option>
                  {uploadSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-2">Or type a new subject name below.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New Subject Name</label>
                <input
                  type="text"
                  value={uploadNewSubjectName}
                  onChange={(e) => {
                    setUploadNewSubjectName(e.target.value);
                    if (e.target.value.trim()) {
                      setUploadSelectedSubjectId('');
                    }
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="Type to create a new subject..."
                  disabled={uploadingFile}
                />
              </div>

              {imageError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                  <p className="text-red-300 text-sm">{imageError}</p>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={resetUploadFlowState}
                  disabled={uploadingFile}
                  className="px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={uploadingFile || !uploadTitle.trim()}
                  className="px-6 py-3 bg-[var(--color-primary)] hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingFile ? 'Processing...' : 'Create Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVoiceDetailsForm && recordingBlob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Voice Note Details</h2>
              <button
                onClick={() => setShowVoiceDetailsForm(false)}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={uploadingVoice}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                <p className="text-sm text-gray-300 mb-2">Recording Preview</p>
                {recordingPreviewUrl && <audio controls src={recordingPreviewUrl} className="w-full" />}
                <p className="text-xs text-gray-400 mt-2">Duration: {formatRecordingDuration(recordingDuration)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">What would you like to do?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVoiceMode('new')}
                    className={`rounded-lg border px-4 py-3 text-sm transition-colors ${
                      voiceMode === 'new'
                        ? 'border-blue-400/50 bg-blue-500/20 text-blue-100'
                        : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    Create New Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceMode('append')}
                    className={`rounded-lg border px-4 py-3 text-sm transition-colors ${
                      voiceMode === 'append'
                        ? 'border-blue-400/50 bg-blue-500/20 text-blue-100'
                        : 'border-white/20 bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    Add to Existing Note
                  </button>
                </div>
              </div>

              {voiceMode === 'new' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                    <input
                      type="text"
                      value={voiceTitle}
                      onChange={(e) => setVoiceTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--color-primary)]"
                      placeholder="Enter note title..."
                      required
                      disabled={uploadingVoice}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Subject (Optional)</label>
                    <select
                      value={voiceSelectedSubjectId}
                      onChange={(e) => {
                        setVoiceSelectedSubjectId(e.target.value);
                        if (e.target.value) {
                          setVoiceNewSubjectName('');
                        }
                      }}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)]"
                      disabled={uploadingVoice || voiceNewSubjectName.trim().length > 0}
                    >
                      <option value="">Select an existing subject...</option>
                      {uploadSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-2">Or type a new subject name below.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">New Subject Name</label>
                    <input
                      type="text"
                      value={voiceNewSubjectName}
                      onChange={(e) => {
                        setVoiceNewSubjectName(e.target.value);
                        if (e.target.value.trim()) {
                          setVoiceSelectedSubjectId('');
                        }
                      }}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[var(--color-primary)]"
                      placeholder="Type to create a new subject..."
                      disabled={uploadingVoice}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select Existing Note</label>
                  <select
                    value={voiceTargetNoteId}
                    onChange={(e) => setVoiceTargetNoteId(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)]"
                    disabled={uploadingVoice}
                  >
                    <option value="">Choose a note...</option>
                    {sortedNotes.map((note) => (
                      <option key={note.id} value={note.id}>
                        {note.title || note.originalFileName || 'Untitled Note'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {voiceError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                  <p className="text-red-300 text-sm">{voiceError}</p>
                  <button
                    type="button"
                    onClick={retryVoiceRecording}
                    disabled={uploadingVoice}
                    className="mt-3 px-3 py-1.5 border border-red-300/40 text-red-100 rounded-md hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    Re-record
                  </button>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowVoiceDetailsForm(false)}
                  disabled={uploadingVoice}
                  className="px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitVoiceRecording}
                  disabled={uploadingVoice}
                  className="px-6 py-3 bg-[var(--color-primary)] hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingVoice ? 'Transcribing...' : voiceMode === 'new' ? 'Create Note' : 'Append to Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload + Voice Ingestion */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Image / PDF Upload</h2>
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-[var(--color-primary)] transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-white text-lg mb-2">Upload an image, PDF or PPT to analyse</p>
            <p className="text-gray-400">Drag and drop an image, PDF or PPT here, or click to browse</p>
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

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Voice Recording</h2>

          <div className="rounded-xl border border-white/15 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-gray-300 text-sm">Record your voice and convert it into notes</p>
              {isRecording && (
                <div className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1 text-xs text-red-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>
                  REC {formatRecordingDuration(recordingDuration)}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-500 px-4 py-2 text-white transition-colors"
                >
                  <Mic className="h-4 w-4" />
                  Start Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-white transition-colors"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </button>
              )}
            </div>

            {recordingPreviewUrl && !isRecording && (
              <div className="mt-5 rounded-lg border border-white/15 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-gray-300 mb-3">
                  <AudioLines className="h-4 w-4" />
                  <span className="text-sm">Preview your recording ({formatRecordingDuration(recordingDuration)})</span>
                </div>
                <audio controls src={recordingPreviewUrl} className="w-full mb-4" />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={openVoiceDetailsForm}
                    className="px-4 py-2 bg-[var(--color-primary)] hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Use Recording
                  </button>
                  <button
                    type="button"
                    onClick={resetVoiceFlowState}
                    className="px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {voiceError && (
              <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-xl p-3">
                <p className="text-red-300 text-sm">{voiceError}</p>
                <button
                  type="button"
                  onClick={retryVoiceRecording}
                  className="mt-3 px-3 py-1.5 border border-red-300/40 text-red-100 rounded-md hover:bg-red-500/20 transition-colors"
                >
                  Re-record
                </button>
              </div>
            )}
          </div>
        </div>
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
                  {note.sourceType === 'VOICE' && (
                    <span className="inline-flex items-center rounded-full border border-blue-400/30 bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-200">
                      Voice note - translated to English
                    </span>
                  )}
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