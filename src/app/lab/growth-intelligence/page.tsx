import type { Metadata } from "next";
import { PageMotion } from "@/components/page-motion";
import { getExperiment } from "@/lab/experiments";
import { Workbench } from "@/lab/growth/ui/workbench";
import { LabShell } from "@/lab/shared/ui/lab-shell";

const experiment = getExperiment("growth-intelligence");

export const metadata: Metadata = {
  title: `${experiment.title} | Lab | Abhishek Jayakumar`,
  description: experiment.short,
};

export default function Page() {
  return (
    <>
      <LabShell experiment={experiment}>
        <Workbench />
      </LabShell>
      <PageMotion />
    </>
  );
}
