import { createFileRoute } from "@tanstack/react-router";
import { Desktop } from "@/components/desktop/Desktop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduNexuZ — ctOS Tutoring Network" },
      { name: "description", content: "EduNexuZ is a tutoring service for math, sciences, languages, computer science and test prep. Free diagnostic call, vetted tutors, matched in 24h." },
      { property: "og:title", content: "EduNexuZ — ctOS Tutoring Network" },
      { property: "og:description", content: "Tutoring for the connected generation. Vetted tutors, diagnostic-first, results-driven." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  return <Desktop />;
}
