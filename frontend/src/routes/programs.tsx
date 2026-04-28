import { createFileRoute } from "@tanstack/react-router";
import { Desktop } from "@/components/desktop/Desktop";

export const Route = createFileRoute("/programs")({
  head: () => ({
    meta: [
      { title: "Programs — EduNexuZ Tutoring" },
      { name: "description", content: "Browse EduNexuZ tutoring programs across math, sciences, languages, computer science and test prep. 1-on-1 and small group, online or in-person." },
      { property: "og:title", content: "Programs — EduNexuZ Tutoring" },
      { property: "og:description", content: "Tutoring programs in math, sciences, languages, CS and test prep." },
    ],
  }),
  component: () => <Desktop initialOpen="programs" />,
});
