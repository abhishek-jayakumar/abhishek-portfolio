import type { Metadata } from "next";
import { PageMotion } from "@/components/page-motion";
import { getExperiment } from "@/lab/experiments";
import { Studio } from "@/lab/paid/ui/studio";
import { LabShell } from "@/lab/shared/ui/lab-shell";

const experiment = getExperiment("paid-media-studio");

export const metadata: Metadata = {
  title: `${experiment.title} | Lab | Abhishek Jayakumar`,
  description: experiment.short,
};

export default function Page() {
  return (
    <>
      <LabShell experiment={experiment}>
        <Studio />
      </LabShell>
      <PageMotion />
    </>
  );
}
