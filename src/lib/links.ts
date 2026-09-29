export function textLinks(text: string) {
  return text.split(/((?:https?:\/\/|www\.)[^\s<>]+)/gi).flatMap((part) => {
    if (!/^(?:https?:\/\/|www\.)/i.test(part))
      return [{ text: part, href: undefined as string | undefined }];
    const label = part.replace(/[.,;!?)]+$/, "");
    try {
      const url = new URL(/^www\./i.test(label) ? `https://${label}` : label);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new Error();
      return [
        { text: label, href: url.href },
        { text: part.slice(label.length), href: undefined },
      ];
    } catch {
      return [{ text: part, href: undefined }];
    }
  });
}
