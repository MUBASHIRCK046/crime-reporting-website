export type UserRole = "citizen" | "police" | "admin";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  age?: number;
  
  // Police-specific fields
  badgeNumber?: string;
  rank?: string;
  stationName?: string;
  stationAddress?: string;
  isActive?: boolean;
  
  createdAt: string;
}

export type ComplaintType = "FIR" | "CSR";
export type ComplaintStatus = "Pending" | "In Progress" | "Resolved" | "Closed";

export interface Complaint {
  id?: string;
  citizenId: string;
  type: ComplaintType;
  title: string;
  description: string;
  location: string;
  status: string;
  priority?: "Low" | "Medium" | "High" | "Critical";
  imageUrl: string | null;
  assignedOfficerId?: string | null;
  category?: string; // name of the category e.g. Robbery
  isVerified?: boolean;
  isBroadcasted?: boolean;
  investigationNotes?: Array<{author: string, text: string, timestamp: string}>;
  createdAt: string;
}

export interface Category {
  id?: string;
  name: string;
  createdAt: string;
}

export interface CaseLog {
  id?: string;
  complaintId: string;
  text: string;
  authorId: string;
  authorName: string;
  authorRole: "police" | "admin";
  timestamp: string;
  isPublic?: boolean;
}



export interface SOSAlert {
  id?: string;
  citizenId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  status: "Active" | "Resolved";
  timestamp: string;
}

export interface FIRIncident extends Record<string, any> {}
export interface FIROffence extends Record<string, any> {}
export interface FIREvidence extends Record<string, any> {}
export interface FIRWitness extends Record<string, any> {}
export interface FIRStatement extends Record<string, any> {}
export interface FIROfficerReview extends Record<string, any> {}
