Create a React + TypeScript text-based video editor web application with the following specifications:

## Tech Stack
- React 18+ with javaScript
- Vite for build tooling
- Shadcn/ui components
- Tailwind CSS for styling
- FFmpeg.wasm for video processing
- @huggingface/transformers (Whisper) for transcription
- Zustand for state management
- Lucide React for icons

## Project Structure
src/
├── components/
│   ├── ui/                    # Shadcn components
│   ├── VideoUploader.jsx      # Drag & drop video upload
│   ├── VideoPlayer.jsx        # Video player with controls
│   ├── TranscriptEditor.jsx   # Editable transcript with word sync
│   ├── Timeline.jsx           # Visual timeline representation
│   ├── ExportPanel.jsx        # Export settings and progress
│   └── Header.jsx             # App header with actions
├── lib/
│   ├── ffmpeg.js             # FFmpeg.wasm utilities
│   ├── transcription.js      # Whisper transcription logic
│   ├── video-processor.js    # Video editing operations
│   └── utils.js              # Helper functions
├──      # 
├── types/
│   └── index.ts              # TypeScript interfaces
└── App.jsx

## Core Features to Implement

### 1. Video Upload Component
- Drag-and-drop area with file input fallback
- Accept common video formats (MP4, MOV, WebM, AVI)
- Show file size and duration
- Display video preview thumbnail
- Loading state during upload

### 2. Video Player
_ use Video.js

- Play/pause, seek, volume controls
- Playback speed adjustment (0.5x, 1x, 1.5x, 2x)
- Current time / total duration display
- Keyboard shortcuts (Space = play/pause, Arrow keys = seek)
- Click on timeline to jump to timestamp

### 3. Transcript Editor (PRIMARY FEATURE)
- Auto-generate transcript using Whisper (Transformers.js)
- Display transcript with word-level timestamps
- Each word is clickable:
  - Click word → jump to that moment in video
  - Click word → highlight it as selected
- Editable text (contentEditable or textarea)
- Delete text → mark that segment for removal from video
- Word highlighting syncs with video playback (current word highlighted)
- Show confidence scores (low confidence = different color)
- Language detection and display
- Manual language selector dropdown
- Search within transcript
- Undo/redo for text edits

### 4. Timeline Visualization
- Visual representation of video segments
- Show kept vs. deleted segments (different colors)
- Segments created from transcript edits
- Draggable playhead
- Zoom in/out controls
- Minimap for long videos

### 5. Video Processing (FFmpeg.wasm)
- Extract audio from video
- Apply cuts based on transcript deletions
- Process in Web Worker (non-blocking)
- Show real-time progress bar
- Concatenate remaining segments
- Maintain audio-video sync

### 6. Export Panel
- Export settings:
  - Format selection (MP4, WebM)
  - Quality presets (High, Medium, Low)
  - Resolution options (Original, 1080p, 720p)
- Export button with loading state
- Progress indicator (percentage, time remaining)
- Download button when complete
- Option to export transcript as SRT/VTT subtitle file

### 7. Additional Features
- Keyboard shortcuts panel (? key to toggle)
- Clear project / Reset button
- Dark mode support
- Responsive design (desktop-first, mobile-friendly)
- Error handling with toast notifications

## UI Layout

┌─────────────────────────────────────────────────┐
│  Header (Logo, Export Button, Settings)        │
├──────────────────┬──────────────────────────────┤
│                  │                              │
│   Transcript     │      Video Player            │
│   Editor         │                              │
│   (Scrollable)   │   ┌────────────────────┐   │
│                  │   │                    │   │
│   [Editable      │   │   Video Preview    │   │
│    Text with     │   │                    │   │
│    timestamps]   │   └────────────────────┘   │
│                  │                              │
│   Search: [___]  │   [Controls: ▶️ ⏸️ 🔊]     │
│                  │                              │
│   Language: [EN] │   Timeline: [=========>]    │
│                  │                              │
├──────────────────┴──────────────────────────────┤
│  Status Bar (Processing, Ready, Error)         │
└─────────────────────────────────────────────────┘





## Shadcn Components to Use
- Button
- Card
- Dialog
- Dropdown Menu
- Input
- Label
- Progress
- Scroll Area
- Select
- Separator
- Slider
- Tabs
- Textarea
- Toast
- Tooltip

## Styling Guidelines
- Use Tailwind utility classes
- Shadcn default theme (customize if needed)
- Consistent spacing (4, 8, 16, 24px)
- Smooth transitions (transition-all duration-200)
- Focus states for accessibility
- Hover effects on interactive elements
- Loading skeletons for async operations

## Key Implementation Details

### FFmpeg.wasm Integration
- Load FFmpeg once on app mount
- Use Web Worker for processing
- Show progress updates every 100ms
- Handle memory efficiently (clean up after processing)

### Whisper Transcription
- Use "Xenova/whisper-small" model initially
- Allow model selection (small, medium, large)
- Process audio in chunks for long videos
- Cache model after first load
- Show transcription progress

### Video Cutting Logic
- Convert deleted text segments to time ranges
- Merge adjacent deleted segments
- Generate FFmpeg filter_complex command
- Example: Keep 0-10s, 15-30s, 35-end

### Performance Optimizations
- Virtualize transcript list for long transcripts
- Debounce transcript edits
- Lazy load FFmpeg.wasm
- Use React.memo for heavy components
- Implement request animation frame for playhead updates

## Error Handling
- File type validation
- File size limits (warn if >500MB)
- Browser compatibility checks (WebAssembly, Web Workers)
- FFmpeg errors with user-friendly messages
- Transcription failures with retry option
- Network errors (if using external APIs)

## Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus management (modals, dialogs)
- Screen reader friendly
- High contrast mode support
- Alt text for icons

## Initial Setup Commands
npm create vite@latest video-editor -- --template react-ts
cd video-editor
npm install
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card dialog input progress select slider tabs toast
npm install @ffmpeg/ffmpeg @ffmpeg/util
npm install @huggingface/transformers

npm install lucide-react
npm install clsx tailwind-merge

## Development Priorities
1. Basic video upload and playback
2. Transcription generation
3. Transcript display with word sync
4. Text editing → video segment deletion
5. Timeline visualization
6. Video export with FFmpeg
7. Polish UI/UX
8. Add keyboard shortcuts
9. Performance optimizations
10. Error handling and edge cases

## Success Criteria
- User can upload a video
- Transcript generates automatically
- Clicking words jumps to video timestamp
- Deleting text removes video segments
- Export produces correct trimmed video
- UI is responsive and intuitive
- Processing happens without page freezes
- Works offline after initial model load

Please implement this application following React best practices, with clean component separation, proper TypeScript typing, and a focus on user experience.