import { createFileRoute } from "@tanstack/react-router";
import { Desktop } from "@/components/desktop/Desktop";

export const Route = createFileRoute("/instructors")({
  head: () => ({
    meta: [
      { title: "Instructors — EduNexuZ Tutoring" },
      { name: "description", content: "Meet the EduNexuZ tutor network — vetted experts in math, sciences, languages and computer science. Plus field notes on study science and learning." },
      { property: "og:title", content: "Instructors — EduNexuZ Tutoring" },
      { property: "og:description", content: "Vetted tutors and learning resources from the EduNexuZ network." },
    ],
  }),
  component: () => <Desktop initialOpen="instructors" />,
});
