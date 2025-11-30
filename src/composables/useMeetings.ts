/**
 * useMeetings Composable
 * Provides reactive state and CRUD operations for meetings
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';
import {
  getAllMeetings,
  getMeeting as dbGetMeeting,
  createMeeting,
  updateMeeting as dbUpdateMeeting,
  deleteMeeting as dbDeleteMeeting
} from '@/services/db.service';
import { deleteAudioFile } from '@/services/opfs.service';
import type { Meeting, MeetingStatus, UpdateMeetingInput, MeetingListItem } from '@/types/meeting';

/**
 * Composable for managing meetings
 */
export function useMeetings() {
  // Reactive state
  const meetings: Ref<Meeting[]> = ref([]);
  const currentMeeting: Ref<Meeting | null> = ref(null);
  const isLoading = ref(false);
  const error: Ref<Error | null> = ref(null);

  // Computed properties
  const hasNoMeetings: ComputedRef<boolean> = computed(() => meetings.value.length === 0);
  
  const completedMeetings: ComputedRef<Meeting[]> = computed(() => 
    meetings.value.filter(m => m.status === 'complete')
  );
  
  const meetingsAsListItems: ComputedRef<MeetingListItem[]> = computed(() =>
    meetings.value.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      createdAt: meeting.createdAt,
      duration: meeting.duration,
      status: meeting.status,
      transcriptPreview: meeting.transcript?.slice(0, 100) || ''
    }))
  );

  /**
   * Load all meetings from the database
   */
  async function loadMeetings(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    
    try {
      const allMeetings = await getAllMeetings();
      meetings.value = allMeetings;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to load meetings');
      console.error('Failed to load meetings:', e);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Get a single meeting by ID
   */
  async function getMeetingById(id: string): Promise<Meeting | null> {
    isLoading.value = true;
    error.value = null;
    
    try {
      const meeting = await dbGetMeeting(id);
      if (meeting) {
        currentMeeting.value = meeting;
        return meeting;
      }
      return null;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to get meeting');
      console.error('Failed to get meeting:', e);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Create a new meeting
   */
  async function addMeeting(meeting: Meeting): Promise<string | null> {
    isLoading.value = true;
    error.value = null;
    
    try {
      const id = await createMeeting(meeting);
      // Add to local list
      meetings.value = [meeting, ...meetings.value];
      return id;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to create meeting');
      console.error('Failed to create meeting:', e);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Update an existing meeting
   */
  async function updateMeeting(id: string, updates: UpdateMeetingInput): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    
    try {
      await dbUpdateMeeting(id, updates);
      
      // Update local state
      const index = meetings.value.findIndex(m => m.id === id);
      if (index !== -1) {
        const existingMeeting = meetings.value[index];
        if (existingMeeting) {
          meetings.value[index] = {
            ...existingMeeting,
            ...updates,
            id: existingMeeting.id, // Ensure ID is preserved
            createdAt: existingMeeting.createdAt, // Ensure createdAt is preserved
            updatedAt: new Date()
          } as Meeting;
        }
      }
      
      // Update current meeting if it's the one being edited
      if (currentMeeting.value?.id === id) {
        const existingCurrent = currentMeeting.value;
        currentMeeting.value = {
          ...existingCurrent,
          ...updates,
          id: existingCurrent.id, // Ensure ID is preserved
          createdAt: existingCurrent.createdAt, // Ensure createdAt is preserved
          updatedAt: new Date()
        } as Meeting;
      }
      
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to update meeting');
      console.error('Failed to update meeting:', e);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Update meeting title
   */
  async function updateTitle(id: string, title: string): Promise<boolean> {
    return updateMeeting(id, { title });
  }

  /**
   * Update meeting transcript
   */
  async function updateTranscript(id: string, transcript: string): Promise<boolean> {
    return updateMeeting(id, { transcript });
  }

  /**
   * Update meeting status
   */
  async function updateStatus(id: string, status: MeetingStatus): Promise<boolean> {
    return updateMeeting(id, { status });
  }

  /**
   * Delete a meeting and its associated audio file
   */
  async function removeMeeting(id: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    
    try {
      // Get the meeting to find associated audio file
      const meeting = meetings.value.find(m => m.id === id) || await dbGetMeeting(id);
      
      // Delete associated audio file from OPFS if exists
      if (meeting?.audioFileId) {
        try {
          await deleteAudioFile(meeting.audioFileId);
        } catch (audioError) {
          console.warn('Failed to delete audio file:', audioError);
          // Continue with meeting deletion even if audio deletion fails
        }
      }
      
      // Delete the meeting from database
      await dbDeleteMeeting(id);
      
      // Remove from local state
      meetings.value = meetings.value.filter(m => m.id !== id);
      
      // Clear current meeting if it was deleted
      if (currentMeeting.value?.id === id) {
        currentMeeting.value = null;
      }
      
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to delete meeting');
      console.error('Failed to delete meeting:', e);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Clear the error state
   */
  function clearError(): void {
    error.value = null;
  }

  /**
   * Clear the current meeting
   */
  function clearCurrentMeeting(): void {
    currentMeeting.value = null;
  }

  /**
   * Refresh meetings list
   */
  async function refresh(): Promise<void> {
    await loadMeetings();
  }

  return {
    // State
    meetings,
    currentMeeting,
    isLoading,
    error,
    
    // Computed
    hasNoMeetings,
    completedMeetings,
    meetingsAsListItems,
    
    // Actions
    loadMeetings,
    getMeetingById,
    addMeeting,
    updateMeeting,
    updateTitle,
    updateTranscript,
    updateStatus,
    removeMeeting,
    clearError,
    clearCurrentMeeting,
    refresh
  };
}

/**
 * Singleton instance for shared state across components
 */
let sharedInstance: ReturnType<typeof useMeetings> | null = null;

/**
 * Get or create the shared meetings instance
 * Use this for shared state across multiple components
 */
export function useSharedMeetings(): ReturnType<typeof useMeetings> {
  if (!sharedInstance) {
    sharedInstance = useMeetings();
  }
  return sharedInstance;
}
