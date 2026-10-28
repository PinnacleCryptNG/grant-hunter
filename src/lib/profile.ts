import type { Profile } from "./types";

export const EMPTY_PROFILE: Profile = {
  name: "",
  headline: "",
  bio: "",
  skills: [],
  links: [],
  portfolio: [],
  country: "",
  timezone: "UTC",
  hourlyRateUsd: null,
  minRewardUsd: null,
  preferredPayout: [],
  avoid: [],
  huntSchedule: "daily",
};

/** A hunt needs something to search for: at least one skill. */
export function hasProfileSignal(p: Pick<Profile, "skills">) {
  return p.skills.length > 0;
}
