import { NetworkData } from "@/types";

export const emptyData: NetworkData = {
  people: [],
  interactions: [],
  followUps: [],
  events: [],
};

const legacyPersonIds = new Set([
  "maya-chen",
  "daniel-okafor",
  "sofia-rossi",
  "alex-morgan",
  "priya-shah",
  "marcus-reed",
  "elena-vasquez",
  "liam-park",
]);

const legacyEventIds = new Set([
  "future-of-work-summit",
  "makers-dinner",
]);

export function removeLegacySampleData(data: NetworkData): NetworkData {
  return {
    people: data.people
      .filter((person) => !legacyPersonIds.has(person.id))
      .map((person) => ({
        ...person,
        connectedPeopleIds: person.connectedPeopleIds.filter((id) => !legacyPersonIds.has(id)),
        eventIds: person.eventIds.filter((id) => !legacyEventIds.has(id)),
      })),
    interactions: data.interactions.filter((interaction) => !legacyPersonIds.has(interaction.personId)),
    followUps: data.followUps.filter((followUp) => !legacyPersonIds.has(followUp.personId)),
    events: data.events
      .filter((event) => !legacyEventIds.has(event.id))
      .map((event) => ({
        ...event,
        peopleIds: event.peopleIds.filter((id) => !legacyPersonIds.has(id)),
      })),
  };
}
