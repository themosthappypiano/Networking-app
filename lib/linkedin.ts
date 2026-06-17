import { PersonInput } from "@/types";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function text(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim())?.toString().trim() || "";
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => typeof item === "string" ? item : text(record(item).name, record(item).title))
    .filter(Boolean);
}

function describeExperience(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value.slice(0, 5).map((item) => {
    const entry = record(item);
    const role = text(entry.title, entry.position, entry.role);
    const company = text(entry.companyName, entry.company, record(entry.company).name);
    return [role, company].filter(Boolean).join(" at ");
  }).filter(Boolean).join("; ");
}

export function normalizeLinkedInProfile(raw: UnknownRecord, linkedinUrl: string): Partial<PersonInput> {
  const profile = Object.keys(record(raw.profile)).length
    ? record(raw.profile)
    : Object.keys(record(raw.basic_info)).length
      ? record(raw.basic_info)
      : raw;
  const currentPosition = record(
    profile.currentPosition
    || (Array.isArray(raw.experience) ? raw.experience.find((item) => record(item).is_current === true) || raw.experience[0] : undefined)
    || (Array.isArray(profile.experience) ? profile.experience[0] : undefined)
    || (Array.isArray(profile.positions) ? profile.positions[0] : undefined),
  );
  const firstName = text(profile.firstName, profile.first_name);
  const lastName = text(profile.lastName, profile.last_name);
  const name = text(profile.fullName, profile.fullname, profile.name, profile.full_name, [firstName, lastName].filter(Boolean).join(" "));
  const headline = text(profile.headline, profile.occupation, profile.tagline);
  const role = text(currentPosition.title, currentPosition.position, profile.jobTitle, profile.title, headline);
  const business = text(
    currentPosition.companyName,
    record(currentPosition.company).name,
    currentPosition.company,
    profile.current_company,
    profile.companyName,
    profile.company,
  );
  const locationRecord = record(profile.location);
  const city = text(profile.city, locationRecord.city);
  const country = text(profile.country, profile.countryFullName, locationRecord.country);
  const location = text(profile.locationName, locationRecord.full, profile.location, [city, country].filter(Boolean).join(", "));
  const about = text(profile.about, profile.summary, profile.description, profile.bio);
  const experienceSource = raw.experience || profile.experience || profile.positions;
  const experience = describeExperience(experienceSource);
  const currentSkills = stringList(currentPosition.skills);
  const skills = Array.from(new Set([
    ...stringList(profile.skills),
    ...stringList(profile.top_skills),
    ...currentSkills,
  ])).slice(0, 12);

  return {
    name,
    linkedinUrl,
    avatarUrl: text(
      profile.profilePicture,
      profile.profilePictureUrl,
      profile.profile_picture_url,
      profile.photoUrl,
      profile.avatar,
      profile.image,
    ),
    bannerUrl: text(profile.background_picture_url, profile.backgroundPictureUrl),
    role,
    business,
    location,
    tags: skills,
    notes: about,
    contextLevel: about || experience ? 3 : 2,
    context: {
      summary: "",
      past: experience,
      present: [headline, about].filter(Boolean).join("\n\n"),
      future: "",
      personality: "",
      beliefs: "",
      drives: "",
      opportunities: "",
      risks: "",
    },
  };
}
