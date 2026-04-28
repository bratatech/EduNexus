import { createFileRoute } from "@tanstack/react-router";
import { Desktop } from "@/components/desktop/Desktop";

export const Route = createFileRoute("/enroll")({
  head: () => ({
    meta: [
      { title: "Enroll — EduNexuZ Tutoring" },
      { name: "description", content: "Enroll with EduNexuZ. Tell us about the student and we'll match you with the right tutor within 24 hours. Free diagnostic call, no obligation." },
      { property: "og:title", content: "Enroll — EduNexuZ Tutoring" },
      { property: "og:description", content: "Get matched with a vetted tutor in 24 hours. Free diagnostic call." },
    ],
  }),
  component: () => <Desktop initialOpen="enroll" />,
});
