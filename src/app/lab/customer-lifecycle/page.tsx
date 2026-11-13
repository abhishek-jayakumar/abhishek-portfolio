import type { Metadata } from "next";
import { PageMotion } from "@/components/page-motion";
import { getExperiment } from "@/lab/experiments";
import { Platform } from "@/lab/lifecycle/ui/platform";
import { LabShell } from "@/lab/shared/ui/lab-shell";

const experiment = getExperiment("customer-lifecycle");

export const metadata: Metadata = {
  title: `${experiment.title} | Lab | Abhishek Jayakumar`,
  description: experiment.short,
};

export default function Page() {
  return (
    <>
      <LabShell experiment={experiment}>
        <Platform />
      </LabShell>
      <PageMotion />
    </>
  );
}
