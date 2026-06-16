"use server";

import { createSupabaseClient } from "@/lib/supabase";
import { transaction, getPool } from "@/lib/db";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

// Simple TZ checksum validator (Israeli ID)
function isValidIsraeliID(id: string): boolean {
  id = String(id).trim();
  if (id.length > 9 || id.length < 5 || isNaN(Number(id))) return false;
  
  // Pad with leading zeros
  id = id.padStart(9, "0");
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = Number(id[i]) * ((i % 2) + 1);
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  return sum % 10 === 0;
}

const PHONE_REGEX = /^\+972\d{8,9}$/;
const VALID_GENDERS = new Set(["male", "female", "other", "prefer_not_to_say"]);
const AUTH_MESSAGES = {
  invalidSession: "\u05d4\u05d7\u05d9\u05d1\u05d5\u05e8 \u05d0\u05d9\u05e0\u05d5 \u05ea\u05e7\u05d9\u05df \u05d0\u05d5 \u05e9\u05e4\u05d2 \u05ea\u05d5\u05e7\u05e4\u05d5",
  emailMissing: "\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0 \u05d0\u05d9\u05de\u05d9\u05d9\u05dc \u05dc\u05de\u05e9\u05ea\u05de\u05e9 \u05d4\u05de\u05d7\u05d5\u05d1\u05e8",
  inviteMissing: "\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d4 \u05d4\u05d6\u05de\u05e0\u05d4 \u05de\u05de\u05ea\u05d9\u05e0\u05d4",
  fullNameRequired: "\u05e9\u05dd \u05de\u05dc\u05d0 \u05d4\u05d5\u05d0 \u05e9\u05d3\u05d4 \u05d7\u05d5\u05d1\u05d4",
  nationalIdInvalid: "\u05e0\u05d3\u05e8\u05e9\u05ea \u05ea\u05e2\u05d5\u05d3\u05ea \u05d6\u05d4\u05d5\u05ea \u05d9\u05e9\u05e8\u05d0\u05dc\u05d9\u05ea \u05ea\u05e7\u05d9\u05e0\u05d4",
  phoneInvalid: "\u05e0\u05d3\u05e8\u05e9 \u05de\u05e1\u05e4\u05e8 \u05d8\u05dc\u05e4\u05d5\u05df \u05d9\u05e9\u05e8\u05d0\u05dc\u05d9 \u05ea\u05e7\u05d9\u05df \u05d1\u05e4\u05d5\u05e8\u05de\u05d8 +972",
  passwordInvalid: "\u05d4\u05e1\u05d9\u05e1\u05de\u05d4 \u05d7\u05d9\u05d9\u05d1\u05ea \u05dc\u05d4\u05db\u05d9\u05dc \u05dc\u05e4\u05d7\u05d5\u05ea 8 \u05ea\u05d5\u05d5\u05d9\u05dd",
  licensePhotoRequired: "\u05e6\u05d9\u05dc\u05d5\u05dd \u05e8\u05d9\u05e9\u05d9\u05d5\u05df \u05e0\u05d3\u05e8\u05e9 \u05dc\u05e0\u05d4\u05d2\u05d9\u05dd",
  locationRequired: "\u05de\u05d9\u05e7\u05d5\u05dd \u05e0\u05d3\u05e8\u05e9 \u05dc\u05e0\u05d4\u05d2\u05d9\u05dd",
  birthYearInvalid: "\u05e9\u05e0\u05ea \u05dc\u05d9\u05d3\u05d4 \u05ea\u05e7\u05d9\u05e0\u05d4 \u05e0\u05d3\u05e8\u05e9\u05ea",
  genderRequired: "\u05de\u05d2\u05d3\u05e8 \u05e0\u05d3\u05e8\u05e9 \u05dc\u05e0\u05d4\u05d2\u05d9\u05dd",
  licenseTypeRequired: "\u05e1\u05d5\u05d2 \u05e8\u05d9\u05e9\u05d9\u05d5\u05df \u05e0\u05d3\u05e8\u05e9 \u05dc\u05e0\u05d4\u05d2\u05d9\u05dd",
  licenseIssueYearInvalid: "\u05e9\u05e0\u05ea \u05d4\u05d5\u05e6\u05d0\u05ea \u05e8\u05d9\u05e9\u05d9\u05d5\u05df \u05ea\u05e7\u05d9\u05e0\u05d4 \u05e0\u05d3\u05e8\u05e9\u05ea",
  criminalConsentRequired: "\u05e0\u05d3\u05e8\u05e9\u05ea \u05d4\u05e1\u05db\u05de\u05d4 \u05dc\u05d1\u05d3\u05d9\u05e7\u05ea \u05e8\u05d9\u05e9\u05d5\u05dd \u05e4\u05dc\u05d9\u05dc\u05d9",
  vehicleConfirmationRequired: "\u05e0\u05d3\u05e8\u05e9 \u05d0\u05d9\u05e9\u05d5\u05e8 \u05d1\u05e2\u05dc\u05d5\u05ea \u05e2\u05dc \u05e8\u05db\u05d1 \u05d0\u05de\u05d1\u05d5\u05dc\u05d8\u05d5\u05e8\u05d9",
  profileUpdateFailed: "\u05e2\u05d3\u05db\u05d5\u05df \u05e4\u05e8\u05d5\u05e4\u05d9\u05dc \u05d4\u05d0\u05d9\u05de\u05d5\u05ea \u05e0\u05db\u05e9\u05dc",
  completeSuccess: "\u05d4\u05d4\u05e8\u05e9\u05de\u05d4 \u05d4\u05d5\u05e9\u05dc\u05de\u05d4. \u05d4\u05d7\u05e9\u05d1\u05d5\u05df \u05de\u05de\u05ea\u05d9\u05df \u05dc\u05d0\u05d9\u05e9\u05d5\u05e8.",
  transactionFailed: "\u05e9\u05de\u05d9\u05e8\u05ea \u05d4\u05d4\u05e8\u05e9\u05de\u05d4 \u05e0\u05db\u05e9\u05dc\u05d4",
} as const;

export async function completeOnboarding(
  token: string, 
  formData: {
    fullName: string;
    phone: string;
    nationalId: string;
    password?: string;
    // Driver fields
    location?: string;
    birthYear?: number;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    licenseType?: string;
    licenseIssueYear?: number;
    licensePhotoPath?: string;
    consentCriminalRecord?: boolean;
    ownsVehicleAmbulatory?: boolean;
  }
): Promise<ActionResponse> {
  const supabase = createSupabaseClient();

  // Verify the invite session using the token locally to support integration tests
  const { verifySupabaseJwt } = await import("@/lib/api-auth");
  const claims = verifySupabaseJwt(token);
  
  if (!claims) {
    return { success: false, message: AUTH_MESSAGES.invalidSession };
  }

  const { getPool } = await import("@/lib/db");
  const userResult = await getPool().query('select email from auth.users where id = $1', [claims.sub]);
  const email = userResult.rows[0]?.email?.toLowerCase();
  
  if (!email) {
    return { success: false, message: AUTH_MESSAGES.emailMissing };
  }

  // Find the pending invitation
  const { data: invite, error: inviteError } = await supabase
    .from("invitations")
    .select("*")
    .eq("email", email)
    .eq("status", "pending")
    .single();

  if (inviteError || !invite) {
    return { success: false, message: AUTH_MESSAGES.inviteMissing };
  }

  const role = invite.invited_role;

  // Validations
  if (!formData.fullName) return { success: false, message: AUTH_MESSAGES.fullNameRequired };
  if (!formData.nationalId || !isValidIsraeliID(formData.nationalId)) {
    return { success: false, message: AUTH_MESSAGES.nationalIdInvalid };
  }
  if (!formData.phone || !PHONE_REGEX.test(formData.phone)) {
    return { success: false, message: AUTH_MESSAGES.phoneInvalid };
  }
  if (!formData.password || formData.password.length < 8) {
    return { success: false, message: AUTH_MESSAGES.passwordInvalid };
  }

  if (role === 'driver') {
    if (!formData.licensePhotoPath) return { success: false, message: AUTH_MESSAGES.licensePhotoRequired };
    if (!formData.location?.trim()) return { success: false, message: AUTH_MESSAGES.locationRequired };
    if (!formData.birthYear || formData.birthYear < 1920 || formData.birthYear > new Date().getFullYear() - 17) {
      return { success: false, message: AUTH_MESSAGES.birthYearInvalid };
    }
    if (!formData.gender || !VALID_GENDERS.has(formData.gender)) {
      return { success: false, message: AUTH_MESSAGES.genderRequired };
    }
    if (!formData.licenseType?.trim()) {
      return { success: false, message: AUTH_MESSAGES.licenseTypeRequired };
    }
    if (
      !formData.licenseIssueYear ||
      formData.licenseIssueYear < 1950 ||
      formData.licenseIssueYear > new Date().getFullYear()
    ) {
      return { success: false, message: AUTH_MESSAGES.licenseIssueYearInvalid };
    }
    if (formData.consentCriminalRecord !== true) {
      return { success: false, message: AUTH_MESSAGES.criminalConsentRequired };
    }
    if (formData.ownsVehicleAmbulatory !== true) {
      return { success: false, message: AUTH_MESSAGES.vehicleConfirmationRequired };
    }
  }

  try {
    // 1. Set Password via Admin Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(claims.sub, {
      password: formData.password,
      app_metadata: { app_role: role },
      user_metadata: { full_name: formData.fullName }
    });

    if (updateError) {
      return { success: false, message: AUTH_MESSAGES.profileUpdateFailed, error: updateError.message };
    }

    // 2. Transactional inserts into public tables
    await transaction(async (client) => {
      // Upsert users
      await client.query(
        `insert into public.users (id, full_name, phone, role, status, national_id)
         values ($1, $2, $3, $4, 'pending', $5)
         on conflict (id) do update set
           full_name = excluded.full_name,
           phone = excluded.phone,
           role = excluded.role,
           status = 'pending',
           national_id = excluded.national_id`,
        [claims.sub, formData.fullName, formData.phone, role, formData.nationalId]
      );

      // Insert drivers if needed
      if (role === 'driver') {
        await client.query(
          `insert into public.drivers (
            user_id, contact_phone, location, birth_year, gender, 
            license_type, license_issue_year, license_photo_path, 
            consent_criminal_record, owns_vehicle_ambulatory
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           on conflict (user_id) do update set
            location = excluded.location,
            birth_year = excluded.birth_year,
            gender = excluded.gender,
            license_type = excluded.license_type,
            license_issue_year = excluded.license_issue_year,
            license_photo_path = excluded.license_photo_path,
            consent_criminal_record = excluded.consent_criminal_record,
            owns_vehicle_ambulatory = excluded.owns_vehicle_ambulatory`,
          [
            claims.sub, formData.phone, formData.location, formData.birthYear, 
            formData.gender, formData.licenseType, formData.licenseIssueYear, 
            formData.licensePhotoPath, formData.consentCriminalRecord ?? false, 
            formData.ownsVehicleAmbulatory ?? false
          ]
        );
      }

      // Mark invitation accepted
      await client.query(
        `update public.invitations 
         set status = 'accepted', accepted_at = timezone('utc', now()), auth_user_id = $1
         where id = $2`,
        [claims.sub, invite.id]
      );
    });

    return { success: true, message: AUTH_MESSAGES.completeSuccess };
  } catch (err: unknown) {
    return { success: false, message: AUTH_MESSAGES.transactionFailed, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function approveUser(adminToken: string, targetUserId: string): Promise<ActionResponse> {
  // Verify caller auth locally
  const { verifySupabaseJwt } = await import("@/lib/api-auth");
  const claims = verifySupabaseJwt(adminToken);
  if (!claims) return { success: false, message: "Unauthorized" };

  // Run as transaction using pg
  try {
    await transaction(async (client) => {
      // Check current user role/status
      const res = await client.query(
        `select role, status, can_approve_drivers from public.users where id = $1`,
        [claims.sub]
      );
      if (res.rows.length === 0) throw new Error("Current user not found in public.users");
      
      const adminUser = res.rows[0];
      if (adminUser.status !== 'approved') throw new Error("Only approved users can approve others");

      const targetRes = await client.query(`select role from public.users where id = $1`, [targetUserId]);
      if (targetRes.rows.length === 0) throw new Error("Target user not found");
      const targetRole = targetRes.rows[0].role;

      // Permission matrix
      if (adminUser.role !== 'admin') {
        if (adminUser.role === 'representative' && adminUser.can_approve_drivers === true) {
          if (targetRole !== 'driver') {
            throw new Error("Representatives can only approve drivers");
          }
        } else {
          throw new Error("You do not have permission to approve users");
        }
      }

      // Update status
      await client.query(
        `update public.users set status = 'approved' where id = $1`,
        [targetUserId]
      );
    });

    return { success: true, message: "User approved successfully" };
  } catch (err: unknown) {
    return { success: false, message: "Approval failed", error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function sendInvite(
  callerToken: string,
  email: string,
  invitedRole: "driver" | "representative",
): Promise<ActionResponse> {
  const { verifySupabaseJwt } = await import("@/lib/api-auth");
  const claims = verifySupabaseJwt(callerToken);
  if (!claims) return { success: false, message: "Unauthorized" };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: "Valid email address is required" };
  }
  if (invitedRole !== "driver" && invitedRole !== "representative") {
    return { success: false, message: "Invalid role" };
  }

  try {
    const callerRes = await getPool().query(
      `select role, status, can_approve_drivers from public.users where id = $1`,
      [claims.sub],
    );
    const caller = callerRes.rows[0];
    if (!caller) return { success: false, message: "Caller not found" };
    if (caller.status !== "approved")
      return { success: false, message: "Only approved users can send invitations" };

    // Permission matrix: admin → any role; rep with can_approve_drivers → driver only
    if (caller.role === "admin") {
      // no further restriction
    } else if (caller.role === "representative" && caller.can_approve_drivers === true) {
      if (invitedRole !== "driver") {
        return { success: false, message: "Representatives can only invite drivers" };
      }
    } else {
      return { success: false, message: "You do not have permission to send invitations" };
    }

    // Duplicate pending-invite check (DB constraint also enforces this at insert time)
    const existing = await getPool().query(
      `select id from public.invitations where lower(email) = lower($1) and status = 'pending' limit 1`,
      [email],
    );
    if (existing.rows.length > 0) {
      return { success: false, message: "A pending invitation for this email already exists" };
    }

    // Send the invite through Supabase Auth Admin API
    const supabase = createSupabaseClient();
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${appUrl}/onboarding`,
        data: { app_role: invitedRole, invited_role: invitedRole },
      },
    );

    if (inviteError) {
      if (inviteError.message.toLowerCase().includes("already")) {
        return { success: false, message: "This email address already has an account" };
      }
      return { success: false, message: "Failed to send invitation", error: inviteError.message };
    }

    // Record the invitation
    await getPool().query(
      `insert into public.invitations (email, invited_role, invited_by, status, auth_user_id)
       values ($1, $2, $3, 'pending', $4)
       on conflict do nothing`,
      [email.toLowerCase(), invitedRole, claims.sub, inviteData.user?.id ?? null],
    );

    return { success: true, message: `Invitation sent to ${email}` };
  } catch (err: unknown) {
    return {
      success: false,
      message: "Failed to send invitation",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function rejectUser(adminToken: string, targetUserId: string, reason?: string): Promise<ActionResponse> {
  // Verify caller auth locally
  const { verifySupabaseJwt } = await import("@/lib/api-auth");
  const claims = verifySupabaseJwt(adminToken);
  if (!claims) return { success: false, message: "Unauthorized" };

  try {
    await transaction(async (client) => {
      const res = await client.query(
        `select role, status, can_approve_drivers from public.users where id = $1`,
        [claims.sub]
      );
      if (res.rows.length === 0) throw new Error("Current user not found in public.users");
      
      const adminUser = res.rows[0];
      if (adminUser.status !== 'approved') throw new Error("Only approved users can reject others");

      const targetRes = await client.query(`select role from public.users where id = $1`, [targetUserId]);
      if (targetRes.rows.length === 0) throw new Error("Target user not found");
      const targetRole = targetRes.rows[0].role;

      if (adminUser.role !== 'admin') {
        if (adminUser.role === 'representative' && adminUser.can_approve_drivers === true) {
          if (targetRole !== 'driver') {
            throw new Error("Representatives can only reject drivers");
          }
        } else {
          throw new Error("You do not have permission to reject users");
        }
      }

      await client.query(
        `update public.users set status = 'rejected' where id = $1`,
        [targetUserId]
      );
      
      // If we had an audit table, we'd log the reason here
    });

    return { success: true, message: "User rejected successfully" };
  } catch (err: unknown) {
    return { success: false, message: "Rejection failed", error: err instanceof Error ? err.message : "Unknown error" };
  }
}
