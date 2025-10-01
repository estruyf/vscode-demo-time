export interface Poll {
  id: string;
  sessionId: string;
  speakerId: string;
  title: string;
  description: string;
  type: string;
  options?: PollOption[];
  minRating: number;
  maxRating: number;
  isActive: boolean;
  allowMultipleResponses: boolean;
  createdAt: string;
  openedAt: string;
  responses: PollResponse[];
  totalResponses: number;
  closedAt?: string;
}

export interface PollResponse {
  id: string;
  pollId: string;
  deviceId: string;
  attendeeName: string;
  response: string[] | number | string;
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}
