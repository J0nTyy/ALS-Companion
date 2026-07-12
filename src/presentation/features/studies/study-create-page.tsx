import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/presentation/components/page-header";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { isTauri } from "@/infrastructure/platform/environment";
import { DesktopOnlyNotice } from "./components/desktop-only-notice";
import { StudyForm, type StudyFormValues } from "./components/study-form";
import { useStudiesService } from "./studies-service-context";

/** Screen for creating a study. In browser preview it explains saving is desktop-only. */
export function StudyCreatePage() {
  const navigate = useNavigate();
  const service = useStudiesService();
  const available = isTauri();

  async function handleSubmit(values: StudyFormValues) {
    const study = await service.create({
      name: values.name,
      strain: values.strain,
      status: values.status,
      description: values.description,
    });
    navigate(`/studies/${study.id}`, { replace: true });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="New study"
        description="Give your study a name and the strain you're working with. You can refine everything later."
        actions={
          <Button variant="outline" onClick={() => navigate("/studies")}>
            <ArrowLeft />
            Back to studies
          </Button>
        }
      />

      {available ? (
        <Card className="max-w-2xl">
          <CardContent className="pt-6">
            <StudyForm
              submitLabel="Create study"
              onSubmit={handleSubmit}
              onCancel={() => navigate("/studies")}
            />
          </CardContent>
        </Card>
      ) : (
        <DesktopOnlyNotice />
      )}
    </div>
  );
}
