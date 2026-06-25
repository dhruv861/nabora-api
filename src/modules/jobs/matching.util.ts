/**
 * computeMatchScore — TDD Section 22 exact formula.
 * Pure function: no I/O, fully testable.
 */
export interface MatchFactors {
  distanceKm: number;
  jobSkillSlugs: string[];
  workerSkillSlugs: string[];
  availabilityStatus: string;
  reliabilityScore: number;   // 0–100
  averageRating: number;      // 0–5
  isNewWorker: boolean;
}

export function computeMatchScore(f: MatchFactors): number {
  // New worker hard boost — fixed score placing them visibly but below top workers
  if (f.isNewWorker) return 75;

  const distanceScore =
    f.distanceKm <= 5  ? 100 :
    f.distanceKm <= 10 ? 80  :
    f.distanceKm <= 20 ? 60  : 20;

  // Skill overlap ratio: matched / total job skills (0–1 → 0–100)
  const matched = f.jobSkillSlugs.filter((s) => f.workerSkillSlugs.includes(s)).length;
  const skillScore = f.jobSkillSlugs.length > 0
    ? (matched / f.jobSkillSlugs.length) * 100
    : 50; // no skills required → neutral

  const availScore = ['AVAILABLE_NOW', 'AVAILABLE_THIS_WEEK'].includes(f.availabilityStatus)
    ? 100 : 0;

  const ratingScore = (f.averageRating / 5) * 100;

  return +(
    distanceScore        * 0.35 +
    skillScore           * 0.25 +
    availScore           * 0.15 +
    f.reliabilityScore   * 0.15 +
    ratingScore          * 0.10
  ).toFixed(2);
}

/**
 * buildFeedCacheKey — deterministic key for Redis feed cache.
 * lat/lng rounded to 2dp (~1 km precision) so nearby users share cached pages.
 */
export function buildFeedCacheKey(params: {
  section?: string;
  lat?: string | number;
  lng?: string | number;
  city?: string;
  category?: string;
  payMin?: string | number;
  payMax?: string | number;
  cursor?: string;
}): string {
  const lat = params.lat !== undefined ? Number(params.lat).toFixed(2) : 'x';
  const lng = params.lng !== undefined ? Number(params.lng).toFixed(2) : 'x';
  return [
    'jobs:feed',
    params.section ?? 'featured',
    lat, lng,
    params.city ?? '',
    params.category ?? '',
    params.payMin ?? '',
    params.payMax ?? '',
    params.cursor ?? '',
  ].join(':');
}
