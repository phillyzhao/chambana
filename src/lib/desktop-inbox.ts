export type DesktopInboxGroup = {
  id: number;
  name: string;
  initials: string;
  members: string[];
};

export const DESKTOP_CHAT_SAMPLES: Record<
  number,
  { time: string; messages: { name: string; text: string }[] }
> = {
  0: {
    time: "4m",
    messages: [
      {
        name: "Maya Chen",
        text: "Hey everyone! Looking forward to the walk later.",
      },
      {
        name: "Julia Lee",
        text: "Meet by the garden entrance? I’ll be there at 5:25.",
      },
    ],
  },
  1: {
    time: "18m",
    messages: [
      { name: "Maya Chen", text: "Thanks for the coffee invite!" },
      { name: "Maya Chen", text: "That sounds like a perfect Monday." },
    ],
  },
  2: {
    time: "1h",
    messages: [
      { name: "Maya Chen", text: "What’s everyone reading this week?" },
      { name: "Eli Carter", text: "Bringing my favorite Joan Didion." },
    ],
  },
};

export function desktopConversationPreview(
  id: number,
  sentMessages: Record<number, string[]>,
) {
  const sent = sentMessages[id]?.at(-1);
  if (sent) return `You: ${sent}`;
  const last = DESKTOP_CHAT_SAMPLES[id]?.messages.at(-1);
  return last ? `${last.name.split(" ")[0]}: ${last.text}` : "No messages yet";
}

export function filterDesktopConversations(
  groups: DesktopInboxGroup[],
  query: string,
  unreadOnly: boolean,
  unreadIds: number[],
  sentMessages: Record<number, string[]>,
) {
  const search = query.trim().toLocaleLowerCase();
  return groups.filter(
    (group) =>
      (!unreadOnly || unreadIds.includes(group.id)) &&
      (!search ||
        [
          group.name,
          ...group.members,
          desktopConversationPreview(group.id, sentMessages),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(search)),
  );
}
