import type { Profile } from "./types";

export const EMPTY_PROFILE: Profile = {
  name: "",
  headline: "",
  bio: "",
  skills: [],
  ecosystems: [],
  interests: [],
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

/** A hunt needs something to search for: at least one skill, interest or ecosystem. */
export function hasProfileSignal(p: Pick<Profile, "skills" | "interests" | "ecosystems">) {
  return p.skills.length + p.interests.length + p.ecosystems.length > 0;
}
