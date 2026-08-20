import { createClient } from "@supabase/supabase-js";

function sendJson(response, status, body) {
  response.status(status).json(body);
}

/**
 * Deletes only the account identified by the caller's valid Supabase access
 * token. This is a Vercel serverless function: SUPABASE_SERVICE_ROLE_KEY must
 * be configured only in Vercel, never with a VITE_ prefix.
 */
export default async function handler(request, response) {
  if (request.method !== "DELETE") {
    response.setHeader("Allow", "DELETE");
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return sendJson(response, 503, { error: "Account deletion is not configured. Please contact support." });
  }

  const authorization = request.headers.authorization;
  const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!accessToken) return sendJson(response, 401, { error: "Please sign in before deleting your account." });

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return sendJson(response, 401, { error: "Your session has expired. Please sign in again." });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    console.error("Account deletion failed:", deleteError.message);
    return sendJson(response, 500, { error: "Could not delete your account. Please try again." });
  }

  // All application rows reference auth.users with ON DELETE CASCADE, so this
  // also removes the account's profile, mocks, analyses, settings, and syllabus.
  return sendJson(response, 200, { deleted: true });
}
