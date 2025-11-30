/**
 * Meeting-related type definitions
 */

/**
 * Status of a meeting recording/transcription
 */
export type MeetingStatus = 
  | 'recording'      // Currently recording audio
  | 'transcribing'   // AI processing in progress
  | 'complete'       // Ready to view
  | 'error';         // Something went wrong

/**
 * A segment of transcript with timing information
 */
export interface TranscriptSegment {
  id: string;
  start: number;     // Start time in seconds
  end: number;       // End time in seconds
  text: string;      // Segment text
}

/**
 * Represents a recorded meeting session
 */
export interface Meeting {
  id: string;                    // UUID v4
  title: string;                 // User-provided or generated title
  createdAt: Date;               // When recording started
  updatedAt: Date;               // Last modification
  duration: number;              // Duration in seconds
  transcript: string;            // Full transcript text
  segments: TranscriptSegment[]; // Timestamped segments
  audioFileId: string | null;    // Reference to OPFS audio file
  status: MeetingStatus;         // Recording/transcribing/complete
}

/**
 * Meeting creation input (minimal required fields)
 */
export interface CreateMeetingInput {
  title?: string;
  audioFileId?: string;
}

/**
 * Meeting update input
 */
export interface UpdateMeetingInput {
  title?: string;
  transcript?: string;
  segments?: TranscriptSegment[];
  status?: MeetingStatus;
  duration?: number;
}

/**
 * Meeting list item (subset for performance)
 */
export interface MeetingListItem {
  id: string;
  title: string;
  createdAt: Date;
  duration: number;
  status: MeetingStatus;
  transcriptPreview: string;    // First 100 chars of transcript
}
