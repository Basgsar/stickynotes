import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Pencil, StickyNote, Palette } from 'lucide-react';

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface Note {
  id: string;
  content: string;
  color: RGB;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  isNew?: boolean;
  rotation?: number;
}

function rgbToString(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

const MIN_NOTE_SIZE = {
  width: 100,
  height: 100
};

const MAX_NOTE_SIZE = {
  width: 800,
  height: 800
};

const DEFAULT_NOTE_SIZE = {
  width: 300,
  height: 300
};

const DEFAULT_NOTE_COLOR: RGB = { r: 255, g: 242, b: 198 };

function App() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const savedNotes = localStorage.getItem('notes');
      if (!savedNotes) return [];

      const parsedNotes = JSON.parse(savedNotes);
      
      return parsedNotes.filter((note: any): note is Note => {
        if (!note || typeof note !== 'object') return false;
        
        const isValid = 
          typeof note.id === 'string' &&
          typeof note.content === 'string' &&
          note.color && 
          typeof note.color.r === 'number' &&
          typeof note.color.g === 'number' &&
          typeof note.color.b === 'number' &&
          note.position &&
          typeof note.position.x === 'number' &&
          typeof note.position.y === 'number' &&
          note.size &&
          typeof note.size.width === 'number' &&
          typeof note.size.height === 'number';

        return isValid;
      });
    } catch (error) {
      console.error('Error loading notes from localStorage:', error);
      return [];
    }
  });
  
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const dragRef = useRef<{ type: 'move' | 'resize'; noteId: string; startX: number; startY: number; initialWidth?: number; initialHeight?: number; edge?: string } | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem('notes', JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving notes to localStorage:', error);
    }
  }, [notes]);

  const addNote = () => {
    if (newNote.trim()) {
      const centerX = Math.max(0, Math.min(
        window.innerWidth - DEFAULT_NOTE_SIZE.width,
        window.innerWidth / 2 - DEFAULT_NOTE_SIZE.width / 2
      ));
      const centerY = Math.max(0, Math.min(
        window.innerHeight - DEFAULT_NOTE_SIZE.height,
        window.innerHeight / 2 - DEFAULT_NOTE_SIZE.height / 2
      ));

      const note: Note = {
        id: crypto.randomUUID(),
        content: newNote,
        color: DEFAULT_NOTE_COLOR,
        position: {
          x: centerX,
          y: centerY
        },
        size: { ...DEFAULT_NOTE_SIZE },
        isNew: true,
        rotation: Math.random() * 2 - 1
      };
      setNotes(prevNotes => [...prevNotes, note]);
      setNewNote('');
      
      setTimeout(() => {
        setNotes(prevNotes => prevNotes.map(n => 
          n.id === note.id ? { ...n, isNew: false } : n
        ));
      }, 400);
    }
  };

  const deleteNote = (id: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
  };

  const updateNote = (id: string, content: string) => {
    setNotes(prevNotes => prevNotes.map(note => 
      note.id === id ? { ...note, content } : note
    ));
    setEditingId(null);
  };

  const updateNoteColor = (id: string, color: RGB) => {
    setNotes(prevNotes => prevNotes.map(note =>
      note.id === id ? { ...note, color } : note
    ));
  };

  const handleMouseDown = (e: React.MouseEvent, noteId: string, type: 'move' | 'resize' = 'move', edge?: string) => {
    if (editingId === noteId || editingColor === noteId) return;
    
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;

    if (type === 'move') {
      dragRef.current = {
        type,
        noteId,
        startX: e.clientX - note.position.x,
        startY: e.clientY - note.position.y
      };
    } else {
      dragRef.current = {
        type,
        noteId,
        startX: e.clientX,
        startY: e.clientY,
        initialWidth: note.size.width,
        initialHeight: note.size.height,
        edge
      };
    }

    const target = e.currentTarget as HTMLDivElement;
    target.style.transition = 'none';
    target.style.zIndex = '1000';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !dragRef.current) return;

    e.preventDefault();
    const { type, noteId, startX, startY, initialWidth, initialHeight, edge } = dragRef.current;
    
    if (type === 'move') {
      const newX = Math.max(0, Math.min(window.innerWidth - DEFAULT_NOTE_SIZE.width, e.clientX - startX));
      const newY = Math.max(0, Math.min(window.innerHeight - DEFAULT_NOTE_SIZE.height, e.clientY - startY));

      setNotes(prevNotes => prevNotes.map(note =>
        note.id === noteId
          ? { ...note, position: { x: newX, y: newY } }
          : note
      ));
    } else if (type === 'resize' && initialWidth !== undefined && initialHeight !== undefined) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      setNotes(prevNotes => prevNotes.map(note => {
        if (note.id !== noteId) return note;

        let newWidth = initialWidth;
        let newHeight = initialHeight;
        let newX = note.position.x;
        let newY = note.position.y;

        if (edge?.includes('right')) {
          newWidth = Math.max(MIN_NOTE_SIZE.width, Math.min(MAX_NOTE_SIZE.width, initialWidth + deltaX));
        }
        if (edge?.includes('bottom')) {
          newHeight = Math.max(MIN_NOTE_SIZE.height, Math.min(MAX_NOTE_SIZE.height, initialHeight + deltaY));
        }
        if (edge?.includes('left')) {
          const possibleWidth = Math.max(MIN_NOTE_SIZE.width, Math.min(MAX_NOTE_SIZE.width, initialWidth - deltaX));
          if (possibleWidth !== initialWidth) {
            newWidth = possibleWidth;
            newX = note.position.x + (initialWidth - possibleWidth);
          }
        }
        if (edge?.includes('top')) {
          const possibleHeight = Math.max(MIN_NOTE_SIZE.height, Math.min(MAX_NOTE_SIZE.height, initialHeight - deltaY));
          if (possibleHeight !== initialHeight) {
            newHeight = possibleHeight;
            newY = note.position.y + (initialHeight - possibleHeight);
          }
        }

        return {
          ...note,
          position: { x: newX, y: newY },
          size: { width: newWidth, height: newHeight }
        };
      }));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !dragRef.current) return;

    e.preventDefault();
    const { noteId } = dragRef.current;

    const target = document.querySelector(`[data-note-id="${noteId}"]`) as HTMLDivElement;
    if (target) {
      target.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
      target.style.zIndex = '';
    }

    isDraggingRef.current = false;
    dragRef.current = null;
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        dragRef.current = null;
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const ColorPicker: React.FC<{ noteId: string, color: RGB }> = ({ noteId, color }) => {
    const colors: RGB[] = [
      { r: 255, g: 242, b: 198 },
      { r: 255, g: 217, b: 217 },
      { r: 217, g: 255, b: 219 },
      { r: 217, g: 236, b: 255 },
      { r: 255, g: 226, b: 183 },
      { r: 238, g: 217, b: 255 },
      { r: 255, g: 255, b: 255 },
      { r: 200, g: 250, b: 235 },
    ];

    return (
      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md p-3 rounded-lg shadow-xl z-10 border border-gray-100">
        <div className="grid grid-cols-4 gap-2">
          {colors.map((c, index) => (
            <button
              key={index}
              onClick={() => updateNoteColor(noteId, c)}
              className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 shadow-sm"
              style={{
                backgroundColor: rgbToString(c),
                borderColor: color.r === c.r && color.g === c.g && color.b === c.b
                  ? 'rgb(59, 130, 246)'
                  : 'transparent'
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="min-h-screen bg-white relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="absolute inset-0 mosaic-pattern opacity-20" />

      <div className="relative z-10">
        <div className="fixed top-6 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4 navbar-enter">
          <div className="nav-outline">
            <div className="bg-white/95 backdrop-blur-lg rounded-full shadow-xl p-4 border border-gray-50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-blue-500 shadow-lg">
                    <StickyNote className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-blue-500">
                    Sticky Notes
                  </h1>
                </div>
                <div className="flex-1 flex items-center gap-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addNote()}
                      placeholder="Write your note..."
                      className="w-full px-6 py-2.5 rounded-full border-2 border-gray-200 focus:border-blue-500 focus:outline-none bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-inner"
                    />
                  </div>
                  <button
                    onClick={addNote}
                    className="p-2.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 transform"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-32 min-h-screen">
          {notes.map((note) => {
            if (!note || !note.size || typeof note.size.width !== 'number' || typeof note.size.height !== 'number') {
              return null;
            }

            return (
              <div
                key={note.id}
                data-note-id={note.id}
                onMouseDown={(e) => handleMouseDown(e, note.id)}
                className={`absolute rounded-[6px] p-6 transition-all duration-300 
                  ${note.isNew ? 'note-enter' : ''} 
                  ${editingColor === note.id ? 'cursor-default' : 'cursor-move'} will-change-transform group
                  before:absolute before:inset-0 before:rounded-[6px] before:shadow-[0_10px_20px_rgba(0,0,0,0.1)] before:pointer-events-none
                  after:absolute after:inset-0 after:rounded-[6px] after:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.95),inset_-1px_-1px_2px_rgba(0,0,0,0.1)] after:pointer-events-none
                  hover:scale-[1.02] active:scale-[0.98]
                  flex items-center justify-center`}
                style={{
                  width: `${note.size.width}px`,
                  height: `${note.size.height}px`,
                  backgroundColor: rgbToString(note.color),
                  transform: `translate(${note.position.x}px, ${note.position.y}px) rotate(${note.rotation ?? 0}deg)`,
                  willChange: 'transform',
                  ['--note-width' as string]: `${note.size.width}px`,
                  ['--max-width' as string]: `${MAX_NOTE_SIZE.width}px`,
                }}
              >
                {editingId === note.id ? (
                  <textarea
                    autoFocus
                    defaultValue={note.content}
                    onBlur={(e) => updateNote(note.id, e.target.value)}
                    className="w-full h-full bg-transparent resize-none focus:outline-none text-center note-content"
                  />
                ) : (
                  <p className="whitespace-pre-wrap break-words text-center w-full note-content">
                    {note.content}
                  </p>
                )}
                
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => setEditingId(note.id)}
                    className="p-1.5 rounded-full hover:bg-black/10 transition-colors duration-200"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1.5 rounded-full hover:bg-black/10 transition-colors duration-200"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="absolute bottom-3 left-3">
                  <button
                    onClick={() => setEditingColor(editingColor === note.id ? null : note.id)}
                    className="p-1.5 rounded-full hover:bg-black/10 transition-colors duration-200"
                  >
                    <Palette size={16} />
                  </button>
                </div>

                {editingColor === note.id && (
                  <ColorPicker noteId={note.id} color={note.color} />
                )}

                <div 
                  className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleMouseDown(e, note.id, 'resize', 'top-left')}
                />
                <div 
                  className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleMouseDown(e, note.id, 'resize', 'top-right')}
                />
                <div 
                  className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleMouseDown(e, note.id, 'resize', 'bottom-left')}
                />
                <div 
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleMouseDown(e, note.id, 'resize', 'bottom-right')}
                />
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 cursor-n-resize opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleMouseDown(e, note.id, 'resize', 'top')}
                />
                <div 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 cursor-s-resize opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleMouseDown(e, note.id, 'resize', 'bottom')}
                />
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 cursor-w-resize opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleMouseDown(e, note.id, 'resize', 'left')}
                />
                <div 
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 cursor-e-resize opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => handleMouseDown(e, note.id, 'resize', 'right')}
                />
              </div>
            );
          })}
        </div>

        {notes.length === 0 && (
          <div className="text-center text-gray-400 mt-32">
            <p className="text-xl">No notes yet. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;