// KEYWORD: ADMIN-SERVICE
// PURPOSE: Handles database operations, case assignments, user roles, and status updates for the admin section.

export {
  getAllUsers,
  assignCaseToOfficer,
  updatePoliceOfficerProfile,
  assignUserAsPolice,
  saveSOSResolutionNote,
  updateCaseStatus
} from "@/lib/admin";
