// Lightweight heuristic password strength used by the reset + change
// password forms. Not crypto — just a UX hint. Returns score 0–4 and a
// human label.
export function passwordStrength(pw = '') {
  if (!pw) return { score: 0, label: '' };

  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;

  // Penalize the obvious bad ones — these patterns are caught by half
  // of the world's "what's your password" lists.
  if (/^[a-z]+$/.test(pw)) score = Math.max(1, score - 1);
  if (/^(.)\1+$/.test(pw)) score = 1;

  score = Math.max(1, Math.min(4, score));
  const labels = ['', 'Weak', 'Okay', 'Strong', 'Excellent'];
  return { score, label: labels[score] };
}
