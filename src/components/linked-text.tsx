import { textLinks } from "@/lib/links";

export function LinkedText({ text }: { text: string }) {
  return (
    <span className="linked-text">
      {textLinks(text).map((part, index) =>
        part.href ? (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {part.text}
          </a>
        ) : (
          part.text
        ),
      )}
    </span>
  );
}
